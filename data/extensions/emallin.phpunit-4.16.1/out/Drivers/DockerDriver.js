"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmdExists = require("command-exists");
const escape_string_regexp_1 = require("../Utils/escape-string-regexp");
const vscode = require("vscode");
const PhpUnitResolver_1 = require("./PhpUnitResolver");
class Docker {
    constructor() {
        this.name = "Docker";
    }
    async run(args) {
        const config = vscode.workspace.getConfiguration("phpunit");
        const dockerImage = config.get("docker.image") || "php";
        args = [
            "run",
            "--rm",
            "-t",
            "-v",
            "${pwd}:/app",
            "-w",
            "/app",
            dockerImage,
            "php",
            await this.phpUnitPath(),
        ]
            .concat(args)
            .join(" ")
            .replace(new RegExp((0, escape_string_regexp_1.default)(vscode.workspace.workspaceFolders[0].uri.fsPath), "ig"), "/app")
            .replace(/\\/gi, "/")
            .split(" ");
        const command = `docker ${args.join(" ")}`;
        return {
            command: command,
            exec: "docker",
            args: args,
            problemMatcher: "$phpunit-app",
        };
    }
    async isInstalled() {
        try {
            const dockerExists = await cmdExists("docker");
            return !!(dockerExists && (await this.phpUnitPath()));
        }
        catch (e) {
            return false;
        }
    }
    async phpUnitPath() {
        return (this.phpUnitPathCache ||
            (this.phpUnitPathCache = await (0, PhpUnitResolver_1.resolvePhpUnitPath)()));
    }
}
exports.default = Docker;
//# sourceMappingURL=DockerDriver.js.map