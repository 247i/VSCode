"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.PHPUnitTestRunner = void 0;
const vscode = require("vscode");
const phpunittest_1 = require("./phpunittest");
const path = require("path");
const CodeLensFeature_1 = require("./CodeLens/CodeLensFeature");
const TestExplorerFeature_1 = require("./TestProvider/TestExplorerFeature");
function activate(context) {
    const testOutputFile = path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, "test-output.txt");
    const myExtensionApi = {
        testRedirectedOutputFile: testOutputFile,
    };
    let taskCommand;
    let problemMatcher;
    const outputChannel = vscode.window.createOutputChannel("phpunit");
    exports.PHPUnitTestRunner = new phpunittest_1.TestRunner(outputChannel, {
        setTaskCommand: (command, matcher) => {
            if (process.env.VSCODE_PHPUNIT_TEST === "true") {
                taskCommand = command + " > " + testOutputFile;
            }
            else {
                taskCommand = command;
            }
            problemMatcher = matcher;
        },
    });
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.Test", async (argBuilder) => {
        if (argBuilder) {
            return await exports.PHPUnitTestRunner.runArgs(argBuilder);
        }
        else {
            return await exports.PHPUnitTestRunner.run("test");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.TestNearest", async () => {
        return exports.PHPUnitTestRunner.run("nearest-test");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.TestSuite", async () => {
        return exports.PHPUnitTestRunner.run("suite");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.TestDirectory", async () => {
        return exports.PHPUnitTestRunner.run("directory");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.TestDirectory2", async () => {
        return exports.PHPUnitTestRunner.run("directory2");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.TestDirectory3", async () => {
        return exports.PHPUnitTestRunner.run("directory3");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.RerunLastTest", async () => {
        return exports.PHPUnitTestRunner.run("rerun-last-test");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("phpunit.TestingStop", async () => {
        return exports.PHPUnitTestRunner.stop();
    }));
    context.subscriptions.push(vscode.tasks.registerTaskProvider("phpunit", {
        provideTasks: () => {
            return [
                new vscode.Task({ type: "phpunit", task: "run" }, vscode.TaskScope.Workspace, "run", "phpunit", new vscode.ShellExecution(taskCommand, {
                    env: vscode.workspace.getConfiguration("phpunit").envVars,
                }), problemMatcher || "$phpunit"),
            ];
        },
        // Hack around typescript compiler
        resolveTask: (task, token) => {
            return null;
        },
    }));
    (0, CodeLensFeature_1.addCodeLensFeature)(context);
    (0, TestExplorerFeature_1.addTestExplorerFeature)(context);
    return myExtensionApi;
}
exports.activate = activate;
// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map