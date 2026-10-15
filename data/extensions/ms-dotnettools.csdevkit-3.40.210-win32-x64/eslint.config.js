// @ts-check
const tseslint = require('typescript-eslint')
const eslintConfigPrettier = require('eslint-config-prettier')
const eslintPluginPrettier = require('eslint-plugin-prettier/recommended')

module.exports = tseslint.config(
	{
		ignores: ['out/**', 'dist/**', '**/*.d.ts', 'src/test/assets/**', 'ref/**', '.vscode-test/**', 'node_modules/**'],
	},
	eslintConfigPrettier,
	eslintPluginPrettier,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 6,
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/naming-convention': 'warn',
			curly: 'warn',
			'object-curly-spacing': 'off',
			eqeqeq: 'warn',
			'no-throw-literal': 'error',
			'no-unexpected-multiline': 'error',
			// Prevent the Linux activation-hang regression from ever returning: raw
			// `authentication.getSession` is unbounded and, on Linux, its libsecret/keyring backend
			// can hang rather than reject. All session acquisition must go through the bounded
			// wrappers in `microsoftInternalUser.ts` / `TokenAcquisitionService.ts` (which apply a
			// timeout and keep it off the activation critical path). See PR 767148 for the original
			// regression.
			'no-restricted-syntax': [
				'error',
				{
					selector: "CallExpression[callee.property.name='getSession'][callee.object.property.name='authentication']",
					message:
						'Do not call vscode.authentication.getSession directly — it is unbounded and can hang on Linux keyrings. Use the bounded wrappers in services/identity (microsoftInternalUser.ts or TokenAcquisitionService.ts).',
				},
			],
			'prettier/prettier': [
				'warn',
				{
					printWidth: 160,
					semi: false,
					singleQuote: true,
					trailingComma: 'all',
					useTabs: true,
					endOfLine: 'auto',
					arrowParens: 'avoid',
				},
			],
		},
	},
	{
		// Ban the CLI tool from importing `vscode` or `vscode/*` modules.
		// The CLI runs outside VS Code so these modules are unavailable at runtime.
		files: ['src/cli/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [{ name: 'vscode', allowTypeImports: true }],
					patterns: [{ group: ['vscode/*'], allowTypeImports: true }],
				},
			],
		},
	},
	{
		// The two sanctioned bounded session wrappers. These files are the ONLY place allowed to
		// call vscode.authentication.getSession directly; everything else must go through them.
		files: ['src/services/identity/microsoftInternalUser.ts', 'src/services/identity/TokenAcquisitionService.ts'],
		rules: {
			'no-restricted-syntax': 'off',
		},
	},
)