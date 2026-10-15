"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmdExists = require("command-exists");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
class Path {
    constructor() {
        this.name = "Path";
    }
    async run(args) {
        const execPath = await this.phpPath();
        args = [await this.phpUnitPath()].concat(args);
        const command = `${execPath} ${args.join(" ")}`;
        return {
            command: command,
            exec: execPath,
            args: args,
        };
    }
    async isInstalled() {
        return !!((await this.phpPath()) && (await this.phpUnitPath()));
    }
    async phpPath() {
        if (this.phpPathCache) {
            return this.phpPathCache;
        }
        const config = vscode.workspace.getConfiguration("phpunit");
        try {
            this.phpPathCache = await new Promise((resolve, reject) => {
                const configPath = config.get("php");
                if (fs.existsSync(configPath)) {
                    resolve(configPath);
                }
                else {
                    reject();
                }
            });
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
        const config = vscode.workspace.getConfiguration("phpunit");
        const phpUnitPath = config.get("phpunit");
        this.phpUnitPathCache = !phpUnitPath
            ? undefined
            : await new Promise((resolve, reject) => {
                try {
                    fs.exists(phpUnitPath, (exists) => {
                        if (exists) {
                            this.phpUnitPathCache = phpUnitPath;
                            resolve(this.phpUnitPathCache);
                        }
                        else {
                            const absPhpUnitPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, phpUnitPath);
                            fs.exists(absPhpUnitPath, (absExists) => {
                                if (absExists) {
                                    this.phpUnitPathCache = absPhpUnitPath;
                                    resolve(this.phpUnitPathCache);
                                }
                                else {
                                    resolve("");
                                }
                            });
                        }
                    });
                }
                catch (e) {
                    resolve("");
                }
            });
        this.phpUnitPathCache = this.phpUnitPathCache
            ? `'${this.phpUnitPathCache}'`
            : this.phpUnitPathCache;
        return this.phpUnitPathCache;
    }
}
exports.default = Path;
//# sourceMappingURL=PathDriver.js.map