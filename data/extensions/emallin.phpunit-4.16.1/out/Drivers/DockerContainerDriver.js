"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmdExists = require("command-exists");
const vscode = require("vscode");
const DockerCmdUtils = require("../DockerCmdUtils");
const PhpUnitResolver_1 = require("./PhpUnitResolver");
class DockerContainer {
    constructor() {
        this.name = "DockerContainer";
    }
    async run(args) {
        const params = [
            "exec",
            "-t",
            this.dockerContainer,
            "php",
            await this.phpUnitPath(),
        ].concat(args);
        const command = `docker ${params.join(" ").replace(/\\/gi, "/")}`;
        return {
            command: command,
            exec: "docker",
            args: params,
            problemMatcher: "$phpunit-app",
        };
    }
    async isInstalled() {
        try {
            const config = vscode.workspace.getConfiguration("phpunit");
            const pathMappings = config.get("paths");
            this.dockerContainer = config.get("docker.container");
            if (!this.dockerContainer && pathMappings) {
                const containers = await DockerCmdUtils.default.container.ls();
                if (containers.length > 0) {
                    this.dockerContainer = await vscode.window.showQuickPick(containers.map((r) => r.NAMES), {
                        placeHolder: "Pick a running docker container to run phpunit test in...",
                    });
                    if (!this.dockerContainer) {
                        vscode.window.showInformationMessage(`No docker container selected. Skipping ${this.name} driver.`);
                    }
                }
            }
            return !!(this.dockerContainer &&
                pathMappings &&
                (await cmdExists("docker")) &&
                (await this.phpUnitPath()));
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
exports.default = DockerContainer;
//# sourceMappingURL=DockerContainerDriver.js.map