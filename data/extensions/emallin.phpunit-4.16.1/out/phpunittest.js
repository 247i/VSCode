"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
const child_process_1 = require("child_process");
const fs = require("fs");
const vscode = require("vscode");
const PhpUnitDrivers_1 = require("./Drivers/PhpUnitDrivers");
const PhpParser_1 = require("./PhpParser/PhpParser");
const PhpunitArgBuilder_1 = require("./PhpunitCommand/PhpunitArgBuilder");
class TestRunner {
    constructor(channel, bootstrapBridge) {
        this.regex = {
            class: /class\s+(\w*)\s*\{?/gi,
            method: /\s*public*\s+function\s+(\w*)\s*\(/gi,
        };
        this.channel = channel;
        this.bootstrapBridge = bootstrapBridge;
    }
    getClosestMethodAboveActiveLine(editor) {
        for (let i = editor.selection.active.line; i > 0; --i) {
            const line = editor.document.lineAt(i);
            let regexResult = this.regex.method.exec(line.text);
            if (regexResult) {
                return regexResult[1].toString().trim();
            }
            regexResult = this.regex.class.exec(line.text);
            if (regexResult) {
                return regexResult[1].toString().trim();
            }
        }
        return null;
    }
    async resolveContextArgs(type, argBuilder, config) {
        const editor = vscode.window.activeTextEditor;
        if (type === "test" && editor) {
            if ("xml" === editor.document.languageId &&
                editor.document.uri.path.match(/phpunit\.xml(\.dist)?$/)) {
                argBuilder.withConfig(editor.document.uri.fsPath);
                return await this.resolveSuiteArgsAsync(argBuilder, editor.document.getText());
            }
            const range = editor.document.getWordRangeAtPosition(editor.selection.active);
            if (range) {
                const line = editor.document.lineAt(range.start.line);
                const wordOnCursor = editor.document.getText(range);
                const isFunction = line.text.indexOf("function") !== -1;
                if (isFunction && wordOnCursor != null) {
                    argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
                    argBuilder.withFilter(wordOnCursor);
                    return true;
                }
                else if (line.text.indexOf("class") !== -1) {
                    argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
                    return true;
                }
            }
            if (!config.preferRunClassTestOverQuickPickWindow) {
                let testableList = [];
                // Gather the class and functions to show in the quick pick window.
                {
                    const closestMethod = this.getClosestMethodAboveActiveLine(editor);
                    if (closestMethod) {
                        testableList.push("function - " + closestMethod);
                    }
                    const parsedPhpClass = await (0, PhpParser_1.default)(editor.document.fileName);
                    testableList.push("class - " + parsedPhpClass.name);
                    testableList = testableList.concat(parsedPhpClass.methods.public.map((m) => "function - " + m));
                }
                const selectedTest = await vscode.window.showQuickPick(testableList);
                if (!selectedTest) {
                    return false;
                }
                if (selectedTest.indexOf("function - ") !== -1) {
                    argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
                    argBuilder.withFilter(selectedTest.replace("function - ", ""));
                    return true;
                }
                else if (selectedTest.indexOf("class - ") !== -1) {
                    argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
                    return true;
                }
            }
        }
        else if (type === "nearest-test" && editor) {
            const closestMethod = this.getClosestMethodAboveActiveLine(editor);
            if (!closestMethod) {
                console.error("No method found above the cursor. Make sure the cursor is close to a method.");
                return false;
            }
            argBuilder.addDirectoryOrFile(editor.document.uri.fsPath);
            argBuilder.withFilter(closestMethod);
            return true;
        }
        else if (type === "suite") {
            const files = await vscode.workspace.findFiles("**/phpunit.xml**", "**/vendor/**");
            let selectedSuiteFile = files && files.length === 1 ? files[0].fsPath : undefined;
            if (files && files.length > 1) {
                selectedSuiteFile = await vscode.window.showQuickPick(files.map((f) => f.fsPath), { placeHolder: "Choose test suite file..." });
            }
            if (!selectedSuiteFile) {
                return false;
            }
            const selectedSuiteFileContent = await new Promise((resolve, reject) => {
                fs.readFile(selectedSuiteFile, "utf8", (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
            argBuilder.withConfig(selectedSuiteFile);
            return await this.resolveSuiteArgsAsync(argBuilder, selectedSuiteFileContent);
        }
        else if (type === "directory") {
            if (!editor) {
                console.error("Please open a file in the directory you want to test.");
                return false;
            }
            const currentDir = editor.document.uri.fsPath.replace(/(\/|\\)\w*\.php$/i, "");
            argBuilder.addDirectoryOrFile(currentDir);
            return true;
        }
        else if (type === "directory2") {
            if (!editor) {
                console.error("Please open a file in the directory you want to test.");
                return false;
            }
            const currentDir = editor.document.uri.fsPath.replace(/(\/|\\)[^/\\]+(\/|\\)\w*\.php$/i, "");
            argBuilder.addDirectoryOrFile(currentDir);
            return true;
        }
        else if (type === "directory3") {
            if (!editor) {
                console.error("Please open a file in the directory you want to test.");
                return false;
            }
            const currentDir = editor.document.uri.fsPath.replace(/(\/|\\)[^/\\]+(\/|\\)[^/\\]+(\/|\\)\w*\.php$/i, "");
            argBuilder.addDirectoryOrFile(currentDir);
            return true;
        }
        return false;
    }
    async getDriver(order) {
        const drivers = [
            new PhpUnitDrivers_1.default.Path(),
            new PhpUnitDrivers_1.default.Composer(),
            new PhpUnitDrivers_1.default.Phar(),
            new PhpUnitDrivers_1.default.GlobalPhpUnit(),
            new PhpUnitDrivers_1.default.Command(),
            new PhpUnitDrivers_1.default.DockerContainer(),
            new PhpUnitDrivers_1.default.Docker(),
            new PhpUnitDrivers_1.default.Ssh(),
            new PhpUnitDrivers_1.default.Legacy(),
        ];
        function arrayUnique(array) {
            const a = array.concat();
            for (let i = 0; i < a.length; ++i) {
                for (let j = i + 1; j < a.length; ++j) {
                    if (a[i] === a[j]) {
                        a.splice(j--, 1);
                    }
                }
            }
            return a;
        }
        order = arrayUnique((order || []).concat(drivers.map((d) => d.name)));
        const sortedDrivers = drivers.sort((a, b) => {
            return order.indexOf(a.name) - order.indexOf(b.name);
        });
        for (const d of sortedDrivers) {
            if (await d.isInstalled()) {
                return d;
            }
        }
        return undefined;
    }
    populateArgBuilder(argBuilder) {
        const config = vscode.workspace.getConfiguration("phpunit");
        const configArgs = config.get("args", []);
        argBuilder.addArgs(configArgs);
        const colors = config.get("colors");
        if (colors && configArgs.indexOf(colors) === -1) {
            argBuilder.withColors(colors.replace(/--colors=?/i, ""));
        }
        const pathMappings = config.get("paths");
        if (pathMappings) {
            argBuilder.withPathMappings(pathMappings, vscode.workspace.workspaceFolders[0].uri.fsPath);
        }
    }
    async runArgs(argBuilder, childProcess = false) {
        const config = vscode.workspace.getConfiguration("phpunit");
        const order = config.get("driverPriority");
        const driver = await this.getDriver(order);
        if (!driver) {
            console.error(`Wasn't able to start phpunit.`);
            return;
        }
        this.populateArgBuilder(argBuilder);
        this.lastArgBuilder = argBuilder;
        const runConfig = await driver.run(argBuilder.buildArgs());
        this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);
        this.channel.appendLine(runConfig.command);
        this.bootstrapBridge.setTaskCommand(runConfig.command, runConfig.problemMatcher);
        if (process.env.VSCODE_PHPUNIT_TEST === "true") {
            console.debug(runConfig.command);
        }
        if (childProcess) {
            if (runConfig.args.length > 0) {
                if (runConfig.args[0].startsWith("'")) {
                    runConfig.args[0] = runConfig.args[0]
                        .replace(/^'/g, "")
                        .replace(/'$/g, "");
                }
            }
            const spawnResult = await new Promise((r) => r((0, child_process_1.spawnSync)(runConfig.exec, runConfig.args, {
                encoding: "utf8",
            })));
            return { spawnResult, runConfig };
        }
        else {
            await vscode.commands.executeCommand("workbench.action.terminal.clear");
            await vscode.commands.executeCommand("workbench.action.tasks.runTask", "phpunit: run");
        }
    }
    async run(type) {
        const config = vscode.workspace.getConfiguration("phpunit");
        const order = config.get("driverPriority");
        const driver = await this.getDriver(order);
        if (!driver) {
            console.error(`Wasn't able to start phpunit.`);
            return;
        }
        let argBuilder = new PhpunitArgBuilder_1.PhpunitArgBuilder();
        if (type === "rerun-last-test" && this.lastArgBuilder) {
            argBuilder = this.lastArgBuilder;
        }
        else {
            this.populateArgBuilder(argBuilder);
            const preferRunClassTestOverQuickPickWindow = config.get("preferRunClassTestOverQuickPickWindow", false);
            const shouldRun = await this.resolveContextArgs(type, argBuilder, {
                preferRunClassTestOverQuickPickWindow,
            });
            if (!shouldRun) {
                return;
            }
            this.lastArgBuilder = argBuilder;
        }
        const runConfig = await driver.run(argBuilder.buildArgs());
        this.channel.appendLine(`Running phpunit with driver: ${driver.name}`);
        this.channel.appendLine(runConfig.command);
        this.bootstrapBridge.setTaskCommand(runConfig.command, runConfig.problemMatcher);
        if (process.env.VSCODE_PHPUNIT_TEST === "true") {
            console.debug(runConfig.command);
        }
        await vscode.commands.executeCommand("workbench.action.terminal.clear");
        await vscode.commands.executeCommand("workbench.action.tasks.runTask", "phpunit: run");
    }
    async stop() {
        await vscode.commands.executeCommand("workbench.action.tasks.terminate", "phpunit: run");
    }
    async resolveSuiteArgsAsync(argBuilder, fileContent) {
        const testSuitesMatch = fileContent.match(/<testsuite[^>]+name="[^"]+">/g);
        const testSuites = testSuitesMatch
            ? testSuitesMatch.map((v) => v.match(/name="([^"]+)"/)[1])
            : null;
        if (!testSuites || testSuites.length === 0) {
            return false;
        }
        if (testSuites.length === 1) {
            argBuilder.addSuite(testSuites[0]);
            return true;
        }
        const selectedSuite = await vscode.window.showQuickPick(["Run All Test Suites...", ...testSuites], { placeHolder: "Choose test suite..." });
        if (!selectedSuite) {
            return false;
        }
        if (selectedSuite === "Run All Test Suites...") {
            return true;
        }
        argBuilder.addSuite(selectedSuite);
        return true;
    }
}
exports.TestRunner = TestRunner;
//# sourceMappingURL=phpunittest.js.map