"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class Legacy {
    constructor() {
        this.name = "Legacy";
    }
    async run(args) {
        const execPath = await this.execPath();
        const command = `${execPath} ${args.join(" ")}`;
        return {
            command: command,
            exec: execPath,
            args: args,
        };
    }
    async isInstalled() {
        return !!(await this.execPath());
    }
    async execPath() {
        if (this.phpPathCache) {
            return this.phpPathCache;
        }
        const config = vscode.workspace.getConfiguration("phpunit");
        return (this.phpPathCache = config.get("execPath"));
    }
    async phpUnitPath() {
        throw new Error("Method not implemented.");
    }
}
exports.default = Legacy;
//# sourceMappingURL=LegacyDriver.js.map