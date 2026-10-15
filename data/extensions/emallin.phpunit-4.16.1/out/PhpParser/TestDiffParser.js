"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestFailedDiff = exports.TestDiffParser = void 0;
class TestDiffParser {
    constructor(message, expected, actual) {
        this.message = message;
        this.expected = expected;
        this.actual = actual;
    }
}
exports.TestDiffParser = TestDiffParser;
function getTestFailedDiff(output) {
    const [message] = /^Failed asserting that .*$/im.exec(output);
    if (/--- Expected/gi.test(output)) {
        const expectedMatches = output.match(/^- .*$/gim);
        const expected = expectedMatches.join("\n");
        const actualMatches = output.match(/^\+ .*$/gim);
        const actual = actualMatches.join("\n");
        return new TestDiffParser(message, expected, actual);
    }
    else {
        const [, expected, , actual] = /^Failed asserting that (.*) (is|are|matches expected) (.*)\.$/im.exec(output);
        return new TestDiffParser(message, expected, actual);
    }
}
exports.getTestFailedDiff = getTestFailedDiff;
//# sourceMappingURL=TestDiffParser.js.map