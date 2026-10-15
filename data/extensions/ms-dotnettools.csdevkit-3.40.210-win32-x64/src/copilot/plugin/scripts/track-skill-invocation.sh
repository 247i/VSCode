#!/bin/bash
# Tracks Copilot skill activations for survey triggering.
# Fires on every PostToolUse hook — exits immediately unless a skill was activated
# (either a 'skill' tool call or a read of any skill's SKILL.md). No allowlist: any
# skill counts. This hook only runs while C# Dev Kit is active, because the host only
# loads this plugin when the 'csdevkit.dotnetSkillsEnabled' context is set, and that
# context is set exclusively during extension activation (see chatPlugins 'when' in
# package.json). That extension-activation gate is what scopes tracking to C# Dev Kit.

set +e

return_success() {
    echo '{"continue":true}'
    exit 0
}

# Exit if stdin is a terminal (no piped data)
if [ -t 0 ]; then
    return_success
fi

rawInput=$(cat)

if [ -z "$rawInput" ]; then
    return_success
fi

# Extract the first "<key>":"<value>" pair from the provided JSON string.
# Using the first match (via grep|head) rather than a greedy sed avoids picking up a
# later, attacker/user-controlled "<key>": "..." that may appear inside echoed prompt
# text further down the single-line payload.
extract_json_string_from() {
    printf '%s' "$1" | grep -oE "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -n1 | sed -E 's/.*"[[:space:]]*:[[:space:]]*"([^"]*)"$/\1/'
}

# Convenience wrapper that searches the whole raw payload (used for the top-level tool name).
extract_json_string() {
    extract_json_string_from "$rawInput" "$1"
}

# Extract a string field scoped to a top-level object such as tool_input.skill / toolArgs.skill.
# This mirrors the PowerShell hook ($payload.tool_input.skill), so both hooks agree on which
# field they read even if another same-named key appears elsewhere in the payload (e.g. inside
# echoed prompt text). We take everything after the first occurrence of the "<obj>" key, then read
# the first "<field>":"..." from it. That stays scoped — a same-named key *before* "<obj>" is never
# matched — while being robust to '}' characters inside string values: a brace-balancing match such
# as "\{[^}]*\}" would stop at the first '}' and could truncate the object before reaching the field.
extract_scoped_json_string() {
    local rest
    rest=${rawInput#*\"$1\"}
    [ "$rest" = "$rawInput" ] && return 0   # "<obj>" key not present
    extract_json_string_from "$rest" "$2"
}

# Extract tool_name (VS Code sends snake_case)
toolName=$(extract_json_string "tool_name")
# Fallback to camelCase (Copilot CLI format)
if [ -z "$toolName" ]; then
    toolName=$(extract_json_string "toolName")
fi

# A skill is "activated" in one of two observable ways:
#   1. A dedicated 'skill' tool call (tool_input.skill = <name>) — used by hosts that
#      expose skills as a discrete tool (e.g. the Copilot CLI).
#   2. The agent activating a skill by reading its instructions, i.e. a tool (read_file)
#      whose input path ends in .../<name>/SKILL.md — this is how VS Code Copilot
#      Chat surfaces chatSkills, where there is no dedicated 'skill' tool.
skillName=""
if [ "$toolName" = "skill" ]; then
    skillName=$(extract_scoped_json_string "tool_input" "skill")
    if [ -z "$skillName" ]; then
        skillName=$(extract_scoped_json_string "toolArgs" "skill")
    fi
else
    filePath=$(extract_scoped_json_string "tool_input" "filePath")
    if [ -z "$filePath" ]; then
        filePath=$(extract_scoped_json_string "toolArgs" "filePath")
    fi
    if [ -n "$filePath" ]; then
        # JSON keeps Windows separators escaped (\\); collapse them so the path matches
        # cleanly, then capture the immediate parent folder of SKILL.md (the skill name):
        #   .../skills/csharp-scripts/SKILL.md                 (Copilot CLI layout)
        #   .../copilot/skills/dotnet/csharp-scripts/SKILL.md  (C# Dev Kit bundled layout)
        # both yield "csharp-scripts". We stay agnostic to how many category folders sit
        # above the skill directory.
        filePath=$(printf '%s' "$filePath" | sed 's/\\\\/\//g; s/\\/\//g')
        skillName=$(printf '%s' "$filePath" | sed -nE 's#.*/([^/]+)/[Ss][Kk][Ii][Ll][Ll]\.[Mm][Dd]$#\1#p')
    fi
fi
if [ -z "$skillName" ]; then
    return_success
fi

# No allowlist filtering: ANY activated skill is recorded, including non-.NET skills.
# We deliberately record all skills — not just the in-box .NET skills — because filtering
# to only the shipped skills produced too little survey data to be useful. Broadening to
# any skill increases the volume of invocations feeding the survey trigger. Note this
# means the survey can now fire off the back of non-.NET skill use. Tracking is still
# scoped to C# Dev Kit by the extension-activation gate described in the header (the host
# only loads this plugin while the extension is active).

# Extract session_id
sessionId=$(extract_json_string "session_id")
if [ -z "$sessionId" ]; then
    sessionId=$(extract_json_string "sessionId")
fi

# Write invocation record to tracking file. LOCALAPPDATA is only honoured on Windows so
# this matches SkillSurveyService.getTrackingDirectory(), which uses LOCALAPPDATA only
# when process.platform === 'win32'. If LOCALAPPDATA happens to be set on macOS/Linux the
# reader would still watch the Library/XDG path, so we must not write to LOCALAPPDATA there.
unameOut="$(uname -s 2>/dev/null)"
case "$unameOut" in
    MINGW*|MSYS*|CYGWIN*) isWindows=1 ;;
    *) isWindows=0 ;;
esac
if [ "$isWindows" = "1" ] && [ -n "$LOCALAPPDATA" ]; then
    trackingDir="$LOCALAPPDATA/csdevkit/copilot"
elif [ "$unameOut" = "Darwin" ]; then
    trackingDir="$HOME/Library/Application Support/csdevkit/copilot"
elif [ -n "$XDG_STATE_HOME" ]; then
    trackingDir="$XDG_STATE_HOME/csdevkit/copilot"
else
    trackingDir="$HOME/.local/state/csdevkit/copilot"
fi
trackingFile="$trackingDir/skill-invocations.jsonl"
mkdir -p "$trackingDir" 2>/dev/null

# Escape backslashes and double-quotes so the interpolated values always produce valid
# JSON, mirroring the PowerShell hook's ConvertTo-Json. skillName is allowlisted and
# sessionId is quote-free by extraction, but a stray backslash would otherwise corrupt
# the JSONL line and make the TypeScript reader treat it as malformed.
escape_json() {
    local s=$1
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    printf '%s' "$s"
}

timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
skillNameEsc=$(escape_json "$skillName")
sessionIdEsc=$(escape_json "$sessionId")
printf '{"skill":"%s","sessionId":"%s","timestamp":"%s"}\n' "$skillNameEsc" "$sessionIdEsc" "$timestamp" >> "$trackingFile"

return_success
