"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmdExists = require("command-exists");
const os = require("os");
class GlobalPhpUnit {
    constructor() {
        this.name = "GlobalPhpUnit";
    }
    async run(args) {
        const execPath = await this.phpUnitPath();
        const command = `${execPath} ${args.join(" ")}`;
        return {
            command: command,
            exec: execPath,
            args: args,
        };
    }
    async isInstalled() {
        return !!(await this.phpUnitPath());
    }
    async phpUnitPath() {
        if (this.phpUnitPathCache) {
            return this.phpUnitPathCache;
        }
        try {
            this.phpUnitPathCache =
                os.platform() === "win32"
                    ? await cmdExists("phpunit.bat")
                    : await cmdExists("phpunit");
        }
        catch (e) {
            // Continue regardless of error
        }
        return this.phpUnitPathCache;
    }
}
exports.default = GlobalPhpUnit;
//# sourceMappingURL=GlobalPhpUnitDriver.js.map