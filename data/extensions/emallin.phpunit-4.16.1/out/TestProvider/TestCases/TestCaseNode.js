"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCaseNode = void 0;
class TestCaseNode {
    constructor(kind, name, range, parent = undefined, tags = [], children = []) {
        this.kind = kind;
        this.name = name;
        this.range = range;
        this.parent = parent;
        this.tags = tags;
        this.children = children;
    }
}
exports.TestCaseNode = TestCaseNode;
//# sourceMappingURL=TestCaseNode.js.map