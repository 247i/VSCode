"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CommandDriver_1 = require("./CommandDriver");
const ComposerDriver_1 = require("./ComposerDriver");
const DockerContainerDriver_1 = require("./DockerContainerDriver");
const DockerDriver_1 = require("./DockerDriver");
const GlobalPhpUnitDriver_1 = require("./GlobalPhpUnitDriver");
const LegacyDriver_1 = require("./LegacyDriver");
const PathDriver_1 = require("./PathDriver");
const PharDriver_1 = require("./PharDriver");
const SshDriver_1 = require("./SshDriver");
exports.default = {
    Command: CommandDriver_1.default,
    Composer: ComposerDriver_1.default,
    Docker: DockerDriver_1.default,
    DockerContainer: DockerContainerDriver_1.default,
    GlobalPhpUnit: GlobalPhpUnitDriver_1.default,
    Legacy: LegacyDriver_1.default,
    Path: PathDriver_1.default,
    Phar: PharDriver_1.default,
    Ssh: SshDriver_1.default,
};
//# sourceMappingURL=PhpUnitDrivers.js.map