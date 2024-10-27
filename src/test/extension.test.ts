import * as vscode from "vscode";
import * as assert from "node:assert";
import * as myExtension from "../extension";

suite("SoundSyntax Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");

	suite("Extension Test Suite", () => {
		vscode.window.showInformationMessage("Start all tests.");

		test("SoundSyntax enable configuration", async () => {
			const config = vscode.workspace.getConfiguration();
			await config.update(
				"soundsyntax.enable",
				true,
				vscode.ConfigurationTarget.Global,
			);
			const isSoundSyntaxEnabled = config.get("soundsyntax.enable", false);
			assert.strictEqual(isSoundSyntaxEnabled, true);
		});

		test("SoundSyntax toggle command", async () => {
			await vscode.commands.executeCommand("soundsyntax.toggle");
			let config = vscode.workspace.getConfiguration();
			let isSoundSyntaxEnabled = config.get("soundsyntax.enable", false);
			assert.strictEqual(isSoundSyntaxEnabled, false);
		});

		test("Get token type at cursor", async () => {
			const editor = {
				selection: { active: new vscode.Position(0, 0) },
				document: {
					uri: { toString: () => "testUri" },
					getText: () => "test",
				} as vscode.TextDocument,
			} as vscode.TextEditor;

			const tokenType = await myExtension.getTokenTypeAtCursor(editor);
			assert.strictEqual(tokenType, null);
		});
	});
});
