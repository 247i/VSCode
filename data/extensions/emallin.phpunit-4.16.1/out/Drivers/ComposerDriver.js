"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmdExists = require("command-exists");
const fs = require("fs");
const os = require("os");
const vscode = require("vscode");
class Composer {
    constructor() {
        this.name = "Composer";
    }
    async run(args) {
        let execPath = await this.phpUnitPath();
        if (os.platform() === "win32") {
            execPath = await this.phpPath();
            args = [await this.phpUnitPath()].concat(args);
        }
        const command = `${execPath} ${args.join(" ")}`;
        return {
            command: command,
            exec: execPath,
            args: args,
        };
    }
    async isInstalled() {
        return !!((await this.phpPath()) != null && (await this.phpUnitPath()) != null);
    }
    async phpPath() {
        if (this.phpPathCache) {
            return this.phpPathCache;
        }
        const config = vscode.workspace.getConfiguration("phpunit");
        try {
            this.phpPathCache = await cmdExists(config.get("php"));
        }
        catch (e) {
            try {
                this.phpPathCache = await cmdExists("php");
            }
            catch (e) {
                // Continue regardless of error
            }
        }
        return this.phpPathCache;
    }
    async phpUnitPath() {
        if (this.phpUnitPathCache) {
            return this.phpUnitPathCache;
        }
        const findInWorkspace = async () => {
            const uris = os.platform() === "win32"
                ? await vscode.workspace.findFiles("**/vendor/phpunit/phpunit/phpunit", "**/node_modules/**", 1)
                : await vscode.workspace.findFiles("**/vendor/bin/phpunit", "**/node_modules/**", 1);
            return (this.phpUnitPathCache =
                uris && uris.length > 0 ? uris[0].fsPath : "");
        };
        const config = vscode.workspace.getConfiguration("phpunit");
        const phpUnitPath = config.get("phpunit");
        if (phpUnitPath) {
            this.phpUnitPathCache = await new Promise((resolve, reject) => {
                fs.exists(phpUnitPath, (exists) => {
                    if (exists) {
                        resolve(phpUnitPath);
                    }
                    else {
                        reject();
                    }
                });
            }).catch(findInWorkspace);
        }
        else {
            this.phpUnitPathCache = await findInWorkspace();
        }
        this.phpUnitPathCache = this.phpUnitPathCache
            ? `'${this.phpUnitPathCache}'`
            : this.phpUnitPathCache;
        return this.phpUnitPathCache;
    }
}
exports.default = Composer;
//# sourceMappingURL=ComposerDriver.js.map