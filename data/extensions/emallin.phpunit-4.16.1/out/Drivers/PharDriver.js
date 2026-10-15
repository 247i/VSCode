"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const cmdExists = require("command-exists");
const fs = require("fs");
const vscode = require("vscode");
class Phar {
    constructor() {
        this.name = "Phar";
    }
    async run(args) {
        const execPath = (await this.phpPath());
        args = [await this.phpUnitPath()].concat(args);
        const command = `${execPath} ${args.join(" ")}`;
        return {
            command: command,
            exec: execPath,
            args: args,
        };
    }
    async isInstalled() {
        return !!((await this.phpPath()) &&
            (await this.hasPharExtension()) &&
            (await this.phpUnitPath()));
    }
    async hasPharExtension() {
        if (this.hasPharExtensionCache) {
            return this.hasPharExtensionCache;
        }
        return (this.hasPharExtensionCache = await new Promise(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
            cp.exec(`${await this.phpPath()} -r "echo extension_loaded('phar');"`, (err, stdout, stderr) => {
                resolve(stdout === "1");
            });
        }));
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
        if (this.phpUnitPharPathCache) {
            return this.phpUnitPharPathCache;
        }
        const findInWorkspace = async () => {
            const uris = await vscode.workspace.findFiles("**/phpunit*.phar", "**/node_modules/**", 1);
            this.phpUnitPharPathCache =
                uris && uris.length > 0 ? uris[0].fsPath : undefined;
            return this.phpUnitPharPathCache;
        };
        const config = vscode.workspace.getConfiguration("phpunit");
        const phpUnitPath = config.get("phpunit");
        if (phpUnitPath && phpUnitPath.endsWith(".phar")) {
            this.phpUnitPharPathCache = await new Promise((resolve, reject) => {
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
            this.phpUnitPharPathCache = await findInWorkspace();
        }
        this.phpUnitPharPathCache = this.phpUnitPharPathCache
            ? `'${this.phpUnitPharPathCache}'`
            : this.phpUnitPharPathCache;
        return this.phpUnitPharPathCache;
    }
}
exports.default = Phar;
//# sourceMappingURL=PharDriver.js.map