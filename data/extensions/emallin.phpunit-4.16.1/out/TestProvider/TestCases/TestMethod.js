"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMethod = void 0;
const vscode_1 = require("vscode");
const extension_1 = require("../../extension");
const PhpunitArgBuilder_1 = require("../../PhpunitCommand/PhpunitArgBuilder");
const TestDiffParser_1 = require("../../PhpParser/TestDiffParser");
const os = require("os");
class TestMethod {
    constructor(fileName, method, range, className = undefined, namespace = undefined, isResolved = true) {
        this.fileName = fileName;
        this.method = method;
        this.range = range;
        this.className = className;
        this.namespace = namespace;
        this.isResolved = isResolved;
    }
    getId() {
        return `${this.fileName}${this.namespace ? `/${this.namespace}` : ""}${this.className ? `/${this.className}` : ""}/${this.method}`;
    }
    getLabel() {
        return this.method;
    }
    getRange() {
        return this.range;
    }
    async run(item, options) {
        const start = Date.now();
        const argBuilder = new PhpunitArgBuilder_1.PhpunitArgBuilder();
        argBuilder.addDirectoryOrFile(this.fileName);
        argBuilder.withFilter(this.method);
        const { spawnResult, runConfig } = (await extension_1.PHPUnitTestRunner.runArgs(argBuilder, true));
        const duration = Date.now() - start;
        options.appendOutput(`${[runConfig.exec, ...runConfig.args].join(" ")}${os.EOL}${os.EOL}`, undefined, item);
        if (spawnResult.stdout) {
            options.appendOutput(`${spawnResult.stdout}${os.EOL}`, undefined, item);
        }
        if (spawnResult.stderr) {
            console.error(spawnResult.stderr);
        }
        if (spawnResult.status === 0) {
            options.passed(item, duration);
            return true;
        }
        try {
            const testDiff = (0, TestDiffParser_1.getTestFailedDiff)(spawnResult.stdout);
            const message = vscode_1.TestMessage.diff(testDiff.message, testDiff.expected, testDiff.actual);
            const lineNumber = /.*\.php:(\d+)/im.exec(spawnResult.stdout);
            const range = lineNumber?.[1]
                ? new vscode_1.Range(parseInt(lineNumber[1]) - 1, 0, parseInt(lineNumber[1]) - 1, 0)
                : item.range;
            message.location = new vscode_1.Location(item.uri, range);
            options.failed(item, message, duration);
            return false;
        }
        catch (e) {
            const duration = Date.now() - start;
            const message = new vscode_1.TestMessage(e.message);
            message.location = new vscode_1.Location(item.uri, item.range);
            options.failed(item, new vscode_1.TestMessage(e.message), duration);
            return false;
        }
    }
}
exports.TestMethod = TestMethod;
//# sourceMappingURL=TestMethod.js.map