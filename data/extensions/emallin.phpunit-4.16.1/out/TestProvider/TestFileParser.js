"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFileParser = void 0;
const vscode_1 = require("vscode");
const php_parser_1 = require("php-parser");
const TestCases_1 = require("./TestCases");
const engine = new php_parser_1.Engine({
    ast: {
        withPositions: true,
    },
    parser: {
        debug: false,
        extractDoc: true,
        suppressErrors: true,
    },
    lexer: {
        all_tokens: false,
        comment_tokens: true,
        mode_eval: false,
        asp_tags: false,
        short_tags: true,
    },
});
class TestFileParser {
    constructor() {
        this.parse = (text, uri) => {
            const ast = engine.parseCode(text, uri.fsPath);
            const testCaseNodes = new Array();
            for (const node of ast.children) {
                if (node.kind === "class") {
                    testCaseNodes.push(this.parseClass(node, uri));
                }
                else if (node.kind === "namespace") {
                    testCaseNodes.push(this.parseNamespace(node, uri));
                }
            }
            return testCaseNodes;
        };
    }
    parseNamespace(node, uri) {
        const testCaseNode = new TestCases_1.TestCaseNode("namespace", node.name, new vscode_1.Range(node.loc.start.line - 1, 0, node.loc.end.line - 1, 0));
        for (const child of node.children) {
            if (child.kind === "class") {
                const testCaseClassNode = this.parseClass(child, uri);
                testCaseClassNode.parent = testCaseNode;
                testCaseNode.children.push(testCaseClassNode);
            }
        }
        return testCaseNode;
    }
    parseClass(node, uri) {
        const className = typeof node.name === "string"
            ? node.name
            : node.name.name;
        const testCaseNode = new TestCases_1.TestCaseNode("class", className, new vscode_1.Range(node.loc.start.line - 1, 0, node.loc.end.line - 1, 0));
        for (const child of node.body) {
            if (child.kind !== "method") {
                continue;
            }
            const testCaseMethodNode = this.parseMethod(child, uri);
            if (testCaseMethodNode) {
                testCaseMethodNode.parent = testCaseNode;
                testCaseNode.children.push(testCaseMethodNode);
            }
        }
        return testCaseNode;
    }
    parseMethod(node, uri) {
        const leadingComments = node.leadingComments || [];
        const hasTestAnnotation = leadingComments.find((comment) => {
            return (comment.kind === "commentblock" &&
                comment.value.indexOf("* @test") != -1);
        });
        const methodName = typeof node.name === "string"
            ? node.name
            : node.name.name;
        if (!methodName.startsWith("test") && !hasTestAnnotation) {
            return null;
        }
        const range = new vscode_1.Range(node.loc.start.line - 1, 0, node.loc.end.line - 1, 0);
        return new TestCases_1.TestCaseNode("method", methodName, range);
    }
}
exports.TestFileParser = TestFileParser;
//# sourceMappingURL=TestFileParser.js.map