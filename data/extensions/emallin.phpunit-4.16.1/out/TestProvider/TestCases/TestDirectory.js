"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDirectory = void 0;
const vscode_1 = require("vscode");
const path = require("path");
const TestCaseRepository_1 = require("./TestCaseRepository");
class TestDirectory {
    constructor(directory, isResolved = false) {
        this.directory = directory;
        this.isResolved = isResolved;
    }
    getId() {
        return `${this.directory}`;
    }
    getLabel() {
        return path.basename(this.directory);
    }
    getRange() {
        return undefined;
    }
    getTestItem() {
        return this.testItem;
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
exports.TestDirectory = TestDirectory;
//# sourceMappingURL=TestDirectory.js.map