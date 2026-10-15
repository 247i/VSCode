"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePhpUnitPath = void 0;
const vscode = require("vscode");
const ComposerDriver_1 = require("./ComposerDriver");
const GlobalPhpUnitDriver_1 = require("./GlobalPhpUnitDriver");
const PathDriver_1 = require("./PathDriver");
const PharDriver_1 = require("./PharDriver");
const phpUnitPath = async () => {
    let path;
    const config = vscode.workspace.getConfiguration("phpunit");
    const order = config.get("driverPriority");
    const drivers = await getDrivers(order);
    for (const driver of drivers) {
        path = await driver.phpUnitPath();
        if (path) {
            return path;
        }
    }
    return "";
};
exports.resolvePhpUnitPath = phpUnitPath;
const getDrivers = (order) => {
    const drivers = [
        new PathDriver_1.default(),
        new ComposerDriver_1.default(),
        new PharDriver_1.default(),
        new GlobalPhpUnitDriver_1.default(),
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
    return sortedDrivers;
};
//# sourceMappingURL=PhpUnitResolver.js.map