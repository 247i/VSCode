"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestClass = void 0;
const vscode_1 = require("vscode");
const TestCaseRepository_1 = require("./TestCaseRepository");
class TestClass {
    constructor(fileName, className, range, namespace = undefined, isResolved = true) {
        this.fileName = fileName;
        this.className = className;
        this.range = range;
        this.namespace = namespace;
        this.isResolved = isResolved;
    }
    getId() {
        return `${this.fileName}${this.namespace ? `/${this.namespace}` : ""}/${this.className}`;
    }
    getLabel() {
        return this.className;
    }
    getRange() {
        return this.range;
    }
    async run(item, options) {
        const start = Date.now();
        const testCasePromises = [];
        for (const [id, child] of item.children) {
            const testCase = TestCaseRepository_1.testData.get(child);
            testCasePromises.push(testCase.run(child, options));
        }
        try {
            await Promise.all(testCasePromises);
            const duration = Date.now() - start;
            options.passed(item, duration);
            return true;
        }
        catch (e) {
            const duration = Date.now() - start;
            const message = new vscode_1.TestMessage("Failed");
            message.location = new vscode_1.Location(item.uri, new vscode_1.Position(0, 0));
            options.failed(item, new vscode_1.TestMessage("Failed"), duration);
            return false;
        }
    }
}
exports.TestClass = TestClass;
//# sourceMappingURL=TestClass.js.map