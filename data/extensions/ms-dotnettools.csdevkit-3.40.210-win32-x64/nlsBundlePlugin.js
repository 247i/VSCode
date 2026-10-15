"use strict";

const crypto = require("crypto");

const NLS_METADATA_SUFFIX = ".nls.metadata.json";

/**
 * Webpack plugin that aggregates per-module `*.nls.metadata.json` files
 * (emitted by the vscode-nls-dev webpack loader) into the bundled NLS files
 * that `vscode-nls` needs at runtime:
 *
 *   - `nls.metadata.header.json`  — bundle identity + content hash
 *   - `nls.metadata.json`         — all modules' keys + messages
 *   - `nls.bundle.json`           — all modules' messages (English default)
 *
 * Without these files, dev builds (`yarn compile`) show
 * "Failed to load message bundle" in the status bar instead of
 * properly localized strings like "Solution: <name>".
 */
class NlsBundlePlugin {
	/**
	 * @param {{ id: string, outDir: string }} options
	 */
	constructor(options) {
		this.id = options.id;
		this.outDir = options.outDir;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("NlsBundlePlugin", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "NlsBundlePlugin",
					stage: compiler.webpack.Compilation
						.PROCESS_ASSETS_STAGE_ADDITIONAL,
				},
				(assets) => {
					const metaData = Object.create(null);
					const bundle = Object.create(null);

					for (const name of Object.keys(assets)) {
						if (!name.endsWith(NLS_METADATA_SUFFIX)) continue;

						const source = assets[name];
						const json = JSON.parse(
							source.source().toString("utf8"),
						);
						const moduleName = (
							json.filePath ||
							name.slice(0, -NLS_METADATA_SUFFIX.length)
						).replace(/\\/g, "/");

						metaData[moduleName] = {
							messages: json.messages,
							keys: json.keys,
						};
						bundle[moduleName] = json.messages;
					}

					if (Object.keys(metaData).length === 0) return;

					// Compute a content-based hash identical to the one
					// produced by vscode-nls-dev's MetaDataBundler.
					const md5 = crypto.createHash("md5");
					for (const key of Object.keys(metaData).sort()) {
						md5.update(key);
						const entry = metaData[key];
						for (const keyInfo of entry.keys) {
							md5.update(
								typeof keyInfo === "string"
									? keyInfo
									: keyInfo.key,
							);
						}
						for (const message of entry.messages) {
							md5.update(message);
						}
					}

					const header = {
						id: this.id,
						type: "extensionBundle",
						hash: md5.digest("hex"),
						outDir: this.outDir,
					};

					const { RawSource } = compiler.webpack.sources;
					compilation.emitAsset(
						"nls.metadata.header.json",
						new RawSource(JSON.stringify(header)),
					);
					compilation.emitAsset(
						"nls.metadata.json",
						new RawSource(JSON.stringify(metaData)),
					);
					compilation.emitAsset(
						"nls.bundle.json",
						new RawSource(JSON.stringify(bundle)),
					);
				},
			);
		});
	}
}

module.exports = NlsBundlePlugin;
