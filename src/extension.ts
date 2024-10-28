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
import { FeedbackHandler } from "./feedbackHandler";
import { TokenTypeProvider } from "./tokenTypeProvider";

export function activate(context: vscode.ExtensionContext) {
  let isSoundSyntaxEnabled = vscode.workspace
    .getConfiguration()
    .get("soundSyntax.enable", false);

  vscode.window.onDidChangeTextEditorSelection(async (event) => {
    if (!isSoundSyntaxEnabled) {
      return;
    }

    const editor = event.textEditor;
    const tokenType = await TokenTypeProvider.getTokenTypeAtCursor(editor);
    if (tokenType) {
      FeedbackHandler.handleTokenType(tokenType);
    }
  });

  vscode.commands.registerCommand("soundSyntax.toggle", async () => {
    isSoundSyntaxEnabled = !isSoundSyntaxEnabled;
    const config = vscode.workspace.getConfiguration();
    await config.update(
      "soundSyntax.enable",
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
    TokenTypeProvider.clearTokenCache(documentUri);
  });

  vscode.workspace.onDidCloseTextDocument((document) => {
    const documentUri = document.uri.toString();
    TokenTypeProvider.clearTokenCache(documentUri);
  });
}

export function deactivate() {}
