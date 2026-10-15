"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCodeLensFeature = void 0;
const vscode_1 = require("vscode");
const PhpCodeLensProvider_1 = require("./PhpCodeLensProvider");
const PhpunitXmlCodeLensProvider_1 = require("./PhpunitXmlCodeLensProvider");
let phpCodeLensProvider;
let phpunitXmlCodeLensProvider;
function addCodeLensFeature(context) {
    const codeLensEnabled = vscode_1.workspace
        .getConfiguration("phpunit")
        .get("codeLens.enabled");
    if (codeLensEnabled) {
        enableCodeLens(context);
    }
    vscode_1.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("phpunit.codeLens.enabled")) {
            const codeLensEnabled = vscode_1.workspace
                .getConfiguration("phpunit")
                .get("codeLens.enabled");
            if (codeLensEnabled) {
                enableCodeLens(context);
            }
            else {
                disableCodeLens(context);
            }
        }
    });
}
exports.addCodeLensFeature = addCodeLensFeature;
function enableCodeLens(context) {
    if (phpCodeLensProvider || phpunitXmlCodeLensProvider) {
        return;
    }
    phpCodeLensProvider = vscode_1.languages.registerCodeLensProvider({
        language: "php",
        scheme: "file",
        pattern: "**/test*/**/*.php",
    }, new PhpCodeLensProvider_1.PhpCodeLensProvider());
    phpunitXmlCodeLensProvider = vscode_1.languages.registerCodeLensProvider({
        language: "xml",
        scheme: "file",
        pattern: "**/phpunit.xml*",
    }, new PhpunitXmlCodeLensProvider_1.PhpunitXmlCodeLensProvider());
    context.subscriptions.push(phpCodeLensProvider);
    context.subscriptions.push(phpunitXmlCodeLensProvider);
}
function disableCodeLens(context) {
    if (!phpCodeLensProvider || !phpunitXmlCodeLensProvider) {
        return;
    }
    const phpCodeLensProviderIdx = context.subscriptions.indexOf(phpCodeLensProvider);
    context.subscriptions.splice(phpCodeLensProviderIdx, 1);
    phpCodeLensProvider.dispose();
    phpCodeLensProvider = null;
    const phpunitXmlCodeLensProviderIdx = context.subscriptions.indexOf(phpunitXmlCodeLensProvider);
    context.subscriptions.splice(phpunitXmlCodeLensProviderIdx, 1);
    phpunitXmlCodeLensProvider.dispose();
    phpunitXmlCodeLensProvider = null;
}
//# sourceMappingURL=CodeLensFeature.js.map