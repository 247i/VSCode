"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const PhpUnitResolver_1 = require("./PhpUnitResolver");
class Command {
    constructor() {
        this.name = "Command";
    }
    async run(args) {
        args = [await this.phpUnitPath()].concat(args);
        const command = `${await this.command()} ${args.join(" ")}`;
        return {
            command: command,
            exec: await this.command(),
            args: args,
            problemMatcher: "$phpunit-app",
        };
    }
    async isInstalled() {
        return !!((await this.command()) && (await this.phpUnitPath()));
    }
    async command() {
        return (this.commandCache ||
            (this.commandCache = vscode.workspace
                .getConfiguration("phpunit")
                .get("command")));
    }
    async phpUnitPath() {
        return (this.phpUnitPathCache ||
            (this.phpUnitPathCache = vscode.workspace
                .getConfiguration("phpunit")
                .get("phpunit")) ||
            (this.phpUnitPathCache = await (0, PhpUnitResolver_1.resolvePhpUnitPath)()));
    }
}
exports.default = Command;
//# sourceMappingURL=CommandDriver.js.map