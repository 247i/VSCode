"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateFromPath = exports.deleteFromUri = exports.gatherTestItems = exports.testData = void 0;
const vscode_1 = require("vscode");
const path = require("path");
const TestFileParser_1 = require("../TestFileParser");
const TestClass_1 = require("./TestClass");
const TestMethod_1 = require("./TestMethod");
const TestDirectory_1 = require("./TestDirectory");
const TestFile_1 = require("./TestFile");
exports.testData = new WeakMap();
function gatherTestItems(collection) {
    const items = [];
    collection.forEach((item) => items.push(item));
    return items;
}
exports.gatherTestItems = gatherTestItems;
async function getOrCreateFromTestCaseNodes(controller, uri, testCaseNodes, parentItemCollecton) {
    for (const testCaseNode of testCaseNodes) {
        if (testCaseNode.kind === "namespace") {
            if (testCaseNode.children?.length > 0) {
                await getOrCreateFromTestCaseNodes(controller, uri, testCaseNode.children, parentItemCollecton);
            }
        }
        else if (testCaseNode.kind === "class") {
            const testCase = new TestClass_1.TestClass(uri.fsPath, testCaseNode.name, testCaseNode.range, testCaseNode.parent?.name);
            let testItem = parentItemCollecton.get(testCase.getId());
            if (!testItem) {
                testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
                exports.testData.set(testItem, testCase);
                testItem.range = testCase.getRange();
                testItem.description = "class";
                parentItemCollecton.add(testItem);
            }
            else {
                testItem.range = testCase.getRange();
            }
            if (testCaseNode.children?.length > 0) {
                await getOrCreateFromTestCaseNodes(controller, uri, testCaseNode.children, testItem.children);
            }
        }
        else if (testCaseNode.kind === "method") {
            const testCase = new TestMethod_1.TestMethod(uri.fsPath, testCaseNode.name, testCaseNode.range, testCaseNode.parent?.name, testCaseNode.parent?.parent?.name);
            let testItem = parentItemCollecton.get(testCase.getId());
            if (!testItem) {
                testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), uri);
                exports.testData.set(testItem, testCase);
                testItem.description = "method";
                testItem.range = testCase.getRange();
                parentItemCollecton.add(testItem);
            }
            else {
                testItem.range = testCase.getRange();
            }
        }
    }
    return gatherTestItems(parentItemCollecton);
}
async function deleteFromUri(controller, testItemCollection, uri) {
    if (uri.scheme !== "file") {
        return;
    }
    const item = testItemCollection.get(uri.fsPath);
    if (item) {
        controller.invalidateTestResults(item);
        testItemCollection.delete(item.id);
        deleteFromTestData(item);
    }
    testItemCollection.forEach((item) => {
        if (item.children) {
            deleteFromUri(controller, item.children, uri);
        }
    });
}
exports.deleteFromUri = deleteFromUri;
function deleteFromTestData(testItem) {
    exports.testData.delete(testItem);
    if (testItem.children) {
        testItem.children.forEach((child) => deleteFromTestData(child));
    }
}
async function createOrUpdateFromPath(controller, filePath, commonDirectory) {
    const pathParts = filePath.replace(commonDirectory, "").split(/[/\\]+/i);
    const paths = [];
    let currentPath = commonDirectory;
    for (const part of pathParts) {
        currentPath = path.join(currentPath, part);
        paths.push(currentPath);
    }
    createOrUpdateItem(controller, controller.items, paths);
}
exports.createOrUpdateFromPath = createOrUpdateFromPath;
async function createOrUpdateItem(controller, parentItemCollecton, paths) {
    const currentPath = paths.shift();
    if (!currentPath) {
        return;
    }
    const item = parentItemCollecton.get(currentPath);
    if (item) {
        createOrUpdateItem(controller, item.children, paths);
        return;
    }
    if (currentPath.endsWith(".php")) {
        const testCase = new TestFile_1.TestFile(currentPath);
        const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), pathToUri(currentPath));
        testItem.canResolveChildren = true;
        parentItemCollecton.add(testItem);
        exports.testData.set(testItem, testCase);
        const currentUri = pathToUri(currentPath);
        const rawContent = await vscode_1.workspace.fs.readFile(currentUri);
        const content = new TextDecoder("utf-8").decode(rawContent);
        const testCaseNodes = new TestFileParser_1.TestFileParser().parse(content, currentUri);
        await getOrCreateFromTestCaseNodes(controller, currentUri, testCaseNodes, testItem.children);
    }
    else {
        const testCase = new TestDirectory_1.TestDirectory(currentPath);
        const testItem = controller.createTestItem(testCase.getId(), testCase.getLabel(), pathToUri(currentPath));
        testItem.canResolveChildren = true;
        parentItemCollecton.add(testItem);
        exports.testData.set(testItem, testCase);
        createOrUpdateItem(controller, testItem.children, paths);
    }
}
function pathToUri(path) {
    return vscode_1.Uri.parse(`file:///${path.replace(/\\/g, "/").replace(":", "%3A")}`);
}
//# sourceMappingURL=TestCaseRepository.js.map