"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const MemberTypes_1 = require("./MemberTypes");
class ParsedPhpClass {
    constructor() {
        this.properties = new MemberTypes_1.default();
        this.methods = new MemberTypes_1.default();
    }
}
function parsePhpToObject(phpClass) {
    const parsed = new ParsedPhpClass();
    const propertyRegex = /(public|protected|private) \$(.*) (?==)/g;
    let propertyMatches = propertyRegex.exec(phpClass);
    while (propertyMatches != null) {
        parsed.properties[propertyMatches[1]].push(propertyMatches[2]);
        propertyMatches = propertyRegex.exec(phpClass);
    }
    const methodRegex = /(public|protected|private) (.*function) (.*)(?=\()/g;
    let methodMatches = methodRegex.exec(phpClass);
    while (methodMatches != null) {
        parsed.methods[methodMatches[1]].push(methodMatches[3]);
        methodMatches = methodRegex.exec(phpClass);
    }
    return parsed;
}
async function parse(filePath) {
    const phpClassAsString = await new Promise((resolve, reject) => {
        fs.readFile(filePath, null, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString("utf8"));
            }
        });
    });
    const parsed = parsePhpToObject(phpClassAsString);
    parsed.name = path.basename(filePath, ".php");
    return parsed;
}
exports.default = parse;
//# sourceMappingURL=PhpParser.js.map