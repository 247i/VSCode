# Tracks Copilot skill activations for survey triggering.
# Fires on every PostToolUse hook - exits immediately unless a skill was activated
# (either a 'skill' tool call or a read of any skill's SKILL.md). No allowlist: any
# skill counts. This hook only runs while C# Dev Kit is active, because the host only
# loads this plugin when the 'csdevkit.dotnetSkillsEnabled' context is set, and that
# context is set exclusively during extension activation (see chatPlugins 'when' in
# package.json). That extension-activation gate is what scopes tracking to C# Dev Kit.

$ErrorActionPreference = 'SilentlyContinue'

function Return-Success {
    Write-Output '{"continue":true}'
    exit 0
}

# Read stdin
$rawInput = [Console]::In.ReadToEnd()

if ([string]::IsNullOrWhiteSpace($rawInput)) {
    Return-Success
}

try {
    $payload = $rawInput | ConvertFrom-Json
} catch {
    Return-Success
}

# Extract tool name (VS Code: tool_name, Copilot CLI: toolName)
$toolName = $payload.tool_name
if (-not $toolName) { $toolName = $payload.toolName }

# A skill is "activated" in one of two observable ways:
#   1. A dedicated 'skill' tool call (tool_input.skill = <name>) — used by hosts that
#      expose skills as a discrete tool (e.g. the Copilot CLI).
#   2. The agent activating a skill by reading its instructions, i.e. a tool (read_file)
#      whose input path ends in .../<name>/SKILL.md — this is how VS Code Copilot
#      Chat surfaces chatSkills, where there is no dedicated 'skill' tool.
$skillName = $null

if ($toolName -eq 'skill') {
    if ($payload.tool_input) { $skillName = $payload.tool_input.skill }
    if (-not $skillName -and $payload.toolArgs) { $skillName = $payload.toolArgs.skill }
} else {
    $filePath = $null
    if ($payload.tool_input) { $filePath = $payload.tool_input.filePath }
    if (-not $filePath -and $payload.toolArgs) { $filePath = $payload.toolArgs.filePath }
    # Capture the immediate parent folder of a SKILL.md path (the skill name), e.g.
    #   .../skills/csharp-scripts/SKILL.md         (Copilot CLI layout)
    #   .../copilot/skills/dotnet/csharp-scripts/SKILL.md  (C# Dev Kit bundled layout)
    # both yield "csharp-scripts". We stay agnostic to how many category folders sit
    # above the skill directory.
    if ($filePath -and $filePath -match '[\\/]([^\\/]+)[\\/]SKILL\.md$') {
        $skillName = $Matches[1]
    }
}

if (-not $skillName) {
    Return-Success
}

# No allowlist filtering: ANY activated skill is recorded, including non-.NET skills.
# We deliberately record all skills — not just the in-box .NET skills — because filtering
# to only the shipped skills produced too little survey data to be useful. Broadening to
# any skill increases the volume of invocations feeding the survey trigger. Note this
# means the survey can now fire off the back of non-.NET skill use. Tracking is still
# scoped to C# Dev Kit by the extension-activation gate described in the header (the host
# only loads this plugin while the extension is active).

# Extract session ID
$sessionId = $payload.session_id
if (-not $sessionId) { $sessionId = $payload.sessionId }

# Write invocation record to tracking file. LOCALAPPDATA is only honoured on Windows so
# this matches SkillSurveyService.getTrackingDirectory(), which uses LOCALAPPDATA only
# when process.platform === 'win32'. The $env:OS check keeps this correct on Windows
# PowerShell 5.1, where the $IsWindows automatic variable is not defined.
if (($IsWindows -or $env:OS -eq 'Windows_NT') -and $env:LOCALAPPDATA) {
    $trackingDir = Join-Path $env:LOCALAPPDATA 'csdevkit/copilot'
} elseif ($IsMacOS) {
    $trackingDir = Join-Path $HOME 'Library/Application Support/csdevkit/copilot'
} elseif ($env:XDG_STATE_HOME) {
    $trackingDir = Join-Path $env:XDG_STATE_HOME 'csdevkit/copilot'
} else {
    $trackingDir = Join-Path $HOME '.local/state/csdevkit/copilot'
}
$trackingFile = Join-Path $trackingDir 'skill-invocations.jsonl'

if (-not (Test-Path $trackingDir)) {
    New-Item -ItemType Directory -Path $trackingDir -Force | Out-Null
}

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$record = @{
    skill = $skillName
    sessionId = $sessionId
    timestamp = $timestamp
} | ConvertTo-Json -Compress

Add-Content -Path $trackingFile -Value $record

Return-Success
