/* 
Sound Syntax - A Visual Studio Code extension that reads out the syntax of the code at the cursor start position.
Copyright (C) 2024 - Emre Cebeci

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. 
*/
import * as vscode from "vscode";
import { AudioPlayer } from "./audioplayer";
import path from "path";

export const tokenCache: { [uri: string]: vscode.SemanticTokens } = {};
const audioPlayer = AudioPlayer.getInstance();

export function activate(context: vscode.ExtensionContext) {
	let isSoundSyntaxEnabled = vscode.workspace
		.getConfiguration()
		.get("soundsyntax.enable", false);

	vscode.commands.registerCommand("soundsyntax.toggle", async () => {
		isSoundSyntaxEnabled = !isSoundSyntaxEnabled;
		const config = vscode.workspace.getConfiguration();
		await config.update(
			"soundsyntax.enable",
			isSoundSyntaxEnabled,
			vscode.ConfigurationTarget.Global,
		);
		vscode.window.showInformationMessage(
			`SoundSyntax ${isSoundSyntaxEnabled ? "enabled" : "disabled"}!`,
		);
	});

	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration("soundsyntax.enable")) {
			const updatedConfig = vscode.workspace.getConfiguration();
			isSoundSyntaxEnabled = updatedConfig.get("soundsyntax.enable", false);
		}
	});

	vscode.workspace.onDidChangeTextDocument((event) => {
		const documentUri = event.document.uri.toString();
		clearTokenCache(documentUri);
	});

	vscode.workspace.onDidCloseTextDocument((document) => {
		const documentUri = document.uri.toString();
		clearTokenCache(documentUri);
	});

	vscode.window.onDidChangeTextEditorSelection(async (event) => {
		if (!isSoundSyntaxEnabled) {
			return;
		}

		const editor = event.textEditor;
		try {
			const tokenType = await getTokenTypeAtCursor(editor);
			if (tokenType) {
				vscode.window.showInformationMessage(tokenType);
				const audioFilePath = path.join(context.extensionPath, 'sounds', 'example.mp3');
				await audioPlayer.playSound(audioFilePath).catch((error) => {
					vscode.window.showErrorMessage("Error playing sound:", error);
				});
			}
		} catch (error) {
			console.error("Error getting token type at cursor: ", error);
		}
	});
}

export async function getTokenTypeAtCursor(
	editor: vscode.TextEditor,
): Promise<string | null> {
	const position = editor.selection.active;
	const document = editor.document;

	if (!document) {
		return null;
	}
	const cacheKey = document.uri.toString();
	let semanticTokens = getCachedTokens(cacheKey);
	if (!semanticTokens) {
		semanticTokens = await getSemanticTokens(document);
		if (!semanticTokens) {
			return null;
		}
		tokenCache[cacheKey] = semanticTokens;
	}

	const tokens = semanticTokens.data;
	let currentLine = 0;
	let currentStartCharacter = 0;
	for (let i = 0; i < tokens.length; i += 5) {
		const deltaLine = tokens[i];
		const deltaStartCharacter = tokens[i + 1];
		// const length = tokens[i + 2];
		const tokenType = tokens[i + 3];
		// const tokenModifiers = tokens[i + 4];

		currentLine += deltaLine;
		currentStartCharacter =
			deltaLine === 0
				? currentStartCharacter + deltaStartCharacter
				: deltaStartCharacter;

		if (
			position.line === currentLine &&
			position.character === currentStartCharacter
		) {
			return getTokenTypeName(document.uri, tokenType);
		}
	}

	return null;
}

async function getTokenTypeName(
	uri: vscode.Uri,
	tokenType: number,
): Promise<string | null> {
	const semanticTokensLegend = await vscode.commands.executeCommand<
		vscode.ProviderResult<vscode.SemanticTokensLegend>
	>("vscode.provideDocumentSemanticTokensLegend", uri);

	return semanticTokensLegend?.tokenTypes[tokenType] || "unknown";
}

async function getSemanticTokens(
	document: vscode.TextDocument,
): Promise<vscode.SemanticTokens | null | undefined> {
	let semanticTokens: vscode.SemanticTokens | null | undefined = null;
	try {
		const cancelToken = new vscode.CancellationTokenSource();
		semanticTokens = await vscode.commands.executeCommand<
			vscode.ProviderResult<vscode.SemanticTokens>
		>("vscode.provideDocumentSemanticTokens", document.uri, cancelToken);
	} catch (error: unknown) {
		vscode.window.showWarningMessage(
			`Error getting document semantic tokens. ${error}`,
		);
		return undefined;
	}

	if (!semanticTokens) {
		return null;
	}
	return semanticTokens;
}

function getCachedTokens(
	uri: string,
): vscode.SemanticTokens | undefined | null {
	return tokenCache[uri];
}

function clearTokenCache(uri: string) {
	delete tokenCache[uri];
}

export function deactivate() {}
