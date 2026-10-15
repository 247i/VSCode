"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhpunitXmlCodeLensProvider = void 0;
const vscode_1 = require("vscode");
const parser_1 = require("@xml-tools/parser");
const ast_1 = require("@xml-tools/ast");
const PhpunitArgBuilder_1 = require("../PhpunitCommand/PhpunitArgBuilder");
let lastDocumentText;
let lastCodeLenses = [];
class PhpunitXmlCodeLensProvider {
    provideCodeLenses(document, token) {
        if (!/phpunit\.xml(\.dist)?/.test(document.fileName)) {
            return [];
        }
        if (document.getText() === lastDocumentText) {
            return lastCodeLenses;
        }
        const { cst, tokenVector } = (0, parser_1.parse)(document.getText());
        const ast = (0, ast_1.buildAst)(cst, tokenVector);
        const codeLenses = [];
        for (const node of ast.rootElement.subElements) {
            if (node.name === "testsuites") {
                codeLenses.push(...this.parseTestSuites(node, document.fileName));
            }
        }
        lastDocumentText = document.getText();
        lastCodeLenses = codeLenses;
        return codeLenses;
    }
    // public resolveCodeLens(codeLens: CodeLens, token: CancellationToken):
    //     CodeLens | Thenable<CodeLens> {
    //   return codeLens;
    // }
    parseTestSuites(node, fileName) {
        const codeLenses = [];
        for (const child of node.subElements) {
            if (child.name === "testsuite") {
                codeLenses.push(this.parseTestSuite(child, fileName));
            }
        }
        if (codeLenses.length > 0) {
            const codeLensRange = new vscode_1.Range(node.position.startLine - 1, 0, node.position.startLine - 1, 0);
            codeLenses.push(new vscode_1.CodeLens(codeLensRange, {
                command: "phpunit.Test",
                title: "Run tests",
                arguments: [new PhpunitArgBuilder_1.PhpunitArgBuilder().withConfig(fileName)],
            }));
        }
        return codeLenses;
    }
    parseTestSuite(node, fileName) {
        const codeLensRange = new vscode_1.Range(node.position.startLine - 1, 0, node.position.startLine - 1, 0);
        const name = node.attributes.find((attribute) => attribute.key === "name")
            .value;
        return new vscode_1.CodeLens(codeLensRange, {
            command: "phpunit.Test",
            title: "Run test",
            arguments: [new PhpunitArgBuilder_1.PhpunitArgBuilder().withConfig(fileName).addSuite(name)],
        });
    }
}
exports.PhpunitXmlCodeLensProvider = PhpunitXmlCodeLensProvider;
//# sourceMappingURL=PhpunitXmlCodeLensProvider.js.map