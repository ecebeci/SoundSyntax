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
import { handleTokenType } from "./feedbackHandler";
import {
  getTokenTypeAtCursorHover,
  getTokenTypeAtCursorStart,
  clearTokenCache,
} from "./tokenTypeProvider";

export function activate(context: vscode.ExtensionContext) {
  let isSoundSyntaxEnabled = vscode.workspace
    .getConfiguration()
    .get("soundSyntax.enable", false);

  vscode.window.onDidChangeTextEditorSelection(async (event) => {
    if (!isSoundSyntaxEnabled) {
      return;
    }

    const editor = event.textEditor;
    const tokenType = await getTokenTypeAtCursorStart(editor);
    if (tokenType) {
      handleTokenType(tokenType);
    }
  });

  vscode.commands.registerCommand("soundSyntax.currentTokenType", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const tokenType = await getTokenTypeAtCursorHover(editor);
    if (tokenType) {
      handleTokenType(tokenType);
    }
  });

  vscode.commands.registerCommand("soundSyntax.setVolume", async () => {
    const volume = await vscode.window.showInputBox({
      placeHolder: "Enter volume level (0-100)",
    });

    if (volume) {
      const config = vscode.workspace.getConfiguration("soundSyntax");
      return config.update("volume", volume, vscode.ConfigurationTarget.Global);
    }
  });

  vscode.commands.registerCommand("soundSyntax.toggle", async () => {
    isSoundSyntaxEnabled = !isSoundSyntaxEnabled;
    const config = vscode.workspace.getConfiguration("soundSyntax");
    await config.update(
      "enable",
      isSoundSyntaxEnabled,
      vscode.ConfigurationTarget.Global,
    );

    vscode.window.showInformationMessage(
      `SoundSyntax ${isSoundSyntaxEnabled ? "enabled" : "disabled"}!`,
    );
  });

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("soundSyntax.enable")) {
      const updatedConfig = vscode.workspace.getConfiguration();
      isSoundSyntaxEnabled = updatedConfig.get("soundSyntax.enable", false);
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
}

export function deactivate() {}
