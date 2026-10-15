"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTestExplorerFeature = void 0;
const vscode_1 = require("vscode");
const TestCases_1 = require("./TestCases");
const path = require("path");
class TestExplorerFeature {
    constructor(ctrl) {
        this.ctrl = ctrl;
        this.watchingTests = new Map();
        this.subscriptions = [];
        this.startTestRun = (request) => {
            const queue = [];
            const run = this.ctrl.createTestRun(request);
            const discoverTests = async (tests) => {
                for (const test of tests) {
                    if (request.exclude?.includes(test)) {
                        continue;
                    }
                    const data = TestCases_1.testData.get(test);
                    run.enqueued(test);
                    queue.push({ test, data });
                }
            };
            const runTestQueue = async () => {
                for (const { test, data } of queue) {
                    if (run.token.isCancellationRequested) {
                        run.skipped(test);
                    }
                    else {
                        run.started(test);
                        await data.run(test, run);
                    }
                }
                run.end();
            };
            discoverTests(request.include ?? (0, TestCases_1.gatherTestItems)(this.ctrl.items)).then(runTestQueue);
        };
        this.runHandler = (request, cancellation) => {
            if (!request.continuous) {
                return this.startTestRun(request);
            }
            if (request.include === undefined) {
                this.watchingTests.set("ALL", request.profile);
                cancellation.onCancellationRequested(() => this.watchingTests.delete("ALL"));
            }
            else {
                request.include.forEach((item) => this.watchingTests.set(item, request.profile));
                cancellation.onCancellationRequested(() => request.include.forEach((item) => this.watchingTests.delete(item)));
            }
        };
        this.subscriptions.push(this.ctrl);
        this.ctrl.refreshHandler = async () => {
            await Promise.all(getWorkspaceTestPatterns().map(({ pattern, exclude }) => findInitialTests(ctrl, pattern, exclude)));
        };
        this.ctrl.createRunProfile("Run Tests", vscode_1.TestRunProfileKind.Run, this.runHandler, true, undefined, true);
        const fileChangedEmitter = this.createFileChangeEmitter();
        this.ctrl.resolveHandler = async (item) => {
            if (!item) {
                this.subscriptions.push(...startWatchingWorkspace(ctrl, fileChangedEmitter));
            }
        };
        for (const document of vscode_1.workspace.textDocuments) {
            updateNodeForDocument(this.ctrl, document);
        }
        this.subscriptions.push(vscode_1.workspace.onDidOpenTextDocument((d) => updateNodeForDocument(this.ctrl, d)), vscode_1.workspace.onDidChangeTextDocument(async (e) => {
            (0, TestCases_1.deleteFromUri)(this.ctrl, this.ctrl.items, e.document.uri);
            await updateNodeForDocument(this.ctrl, e.document);
        }));
    }
    createFileChangeEmitter() {
        const fileChangedEmitter = new vscode_1.EventEmitter();
        fileChangedEmitter.event((uri) => {
            if (this.watchingTests.has("ALL")) {
                this.startTestRun(new vscode_1.TestRunRequest(undefined, undefined, this.watchingTests.get("ALL"), true));
                return;
            }
            const include = [];
            let profile;
            for (const [item, thisProfile] of this.watchingTests) {
                const cast = item;
                if (cast.uri?.toString() == uri.toString()) {
                    include.push(cast);
                    profile = thisProfile;
                }
            }
            if (include.length) {
                this.startTestRun(new vscode_1.TestRunRequest(include, undefined, profile, true));
            }
        });
        return fileChangedEmitter;
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
        this.ctrl.dispose();
    }
}
async function addTestExplorerFeature(context) {
    let testExplorerFeature = null;
    const testExplorerEnabled = vscode_1.workspace
        .getConfiguration("phpunit")
        .get("testExplorer.enabled", false);
    if (testExplorerEnabled) {
        testExplorerFeature = new TestExplorerFeature(vscode_1.tests.createTestController("phpunitTestController", "Phpunit"));
        context.subscriptions.push(testExplorerFeature);
    }
    vscode_1.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("phpunit.testExplorer.enabled")) {
            const testExplorerEnabled = vscode_1.workspace
                .getConfiguration("phpunit")
                .get("testExplorer.enabled");
            if (testExplorerEnabled && !testExplorerFeature) {
                testExplorerFeature = new TestExplorerFeature(vscode_1.tests.createTestController("phpunitTestController", "Phpunit"));
                context.subscriptions.push(testExplorerFeature);
            }
            else if (testExplorerFeature) {
                const idx = context.subscriptions.findIndex((t) => t == testExplorerFeature);
                context.subscriptions.splice(idx, 1);
                testExplorerFeature.dispose();
                testExplorerFeature = null;
            }
        }
    });
}
exports.addTestExplorerFeature = addTestExplorerFeature;
function getWorkspaceTestPatterns() {
    if (!vscode_1.workspace.workspaceFolders) {
        return [];
    }
    const testExplorerPattern = vscode_1.workspace
        .getConfiguration("phpunit")
        .get("testExplorer.include", "**/tests/**/*Test.php");
    return vscode_1.workspace.workspaceFolders.map((workspaceFolder) => ({
        workspaceFolder,
        pattern: new vscode_1.RelativePattern(workspaceFolder, testExplorerPattern),
        exclude: new vscode_1.RelativePattern(workspaceFolder, "**/{.git,node_modules,vendor}/**"),
    }));
}
async function updateNodeForDocument(controller, e) {
    if (e.uri.scheme !== "file") {
        return;
    }
    if (!e.uri.path.endsWith("Test.php")) {
        return;
    }
    const wsPattern = getWorkspaceTestPatterns().find(({ workspaceFolder }) => e.uri.fsPath.startsWith(workspaceFolder.uri.fsPath));
    if (!wsPattern) {
        return;
    }
    const { commonDirectory } = await getFilesAndCommonDirectory(wsPattern.pattern, wsPattern.exclude);
    await (0, TestCases_1.createOrUpdateFromPath)(controller, e.uri.fsPath, commonDirectory);
}
async function findInitialTests(controller, pattern, exclude) {
    const { files, commonDirectory } = await getFilesAndCommonDirectory(pattern, exclude);
    for (const file of files) {
        await (0, TestCases_1.createOrUpdateFromPath)(controller, file.fsPath, commonDirectory);
    }
}
async function getFilesAndCommonDirectory(pattern, exclude) {
    const files = await vscode_1.workspace.findFiles(pattern, exclude);
    const directories = files.map((file) => path.dirname(file.fsPath));
    const commonDirectory = directories.reduce((common, dir) => {
        let i = 0;
        while (i < common.length && common[i] === dir[i]) {
            i++;
        }
        return common.substring(0, i);
    }, directories[0]);
    return { files, commonDirectory };
}
function startWatchingWorkspace(controller, fileChangedEmitter) {
    return getWorkspaceTestPatterns().map(({ workspaceFolder, pattern, exclude }) => {
        const watcher = vscode_1.workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate(async (uri) => {
            const document = await vscode_1.workspace.openTextDocument(uri);
            updateNodeForDocument(controller, document);
            fileChangedEmitter.fire(uri);
        });
        watcher.onDidChange(async (uri) => {
            (0, TestCases_1.deleteFromUri)(controller, controller.items, uri);
            const document = await vscode_1.workspace.openTextDocument(uri);
            await updateNodeForDocument(controller, document);
            fileChangedEmitter.fire(uri);
        });
        watcher.onDidDelete((uri) => (0, TestCases_1.deleteFromUri)(controller, controller.items, uri));
        findInitialTests(controller, pattern, exclude);
        return watcher;
    });
}
//# sourceMappingURL=TestExplorerFeature.js.map