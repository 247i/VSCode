"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const PhpUnitResolver_1 = require("./PhpUnitResolver");
class Ssh {
    constructor() {
        this.name = "Ssh";
    }
    async run(args) {
        const argsString = `${this.phpPathCache} ${this.phpUnitPathCache} ${args.join(" ")}`;
        return {
            command: `${this.ssh.replace("<command>", argsString)}`,
            // TODO: ssh might be more than the ssh executable here, so we need to split it up.
            exec: this.ssh,
            args: args,
        };
    }
    async isInstalled() {
        const config = vscode.workspace.getConfiguration("phpunit");
        this.ssh = config.get("ssh");
        return !!(this.ssh && (await this.phpPath()) && (await this.phpUnitPath()));
    }
    async phpPath() {
        if (this.phpPathCache) {
            return this.phpPathCache;
        }
        const config = vscode.workspace.getConfiguration("phpunit");
        this.phpPathCache = config.get("php", "php"); // Use default `php` for this driver since we probably can assume `php` is on path.
        return this.phpPathCache;
    }
    async phpUnitPath() {
        if (this.phpUnitPathCache) {
            return this.phpUnitPathCache;
        }
        const config = vscode.workspace.getConfiguration("phpunit");
        this.phpUnitPathCache = config.get("phpunit");
        return (this.phpUnitPathCache ||
            (this.phpUnitPathCache = await (0, PhpUnitResolver_1.resolvePhpUnitPath)()));
    }
}
exports.default = Ssh;
//# sourceMappingURL=SshDriver.js.map