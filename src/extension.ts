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
import type { ITokenConfiguration } from "./interfaces/ITokenConfiguration";

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

  vscode.commands.registerCommand("soundSyntax.toggle", async () => {
    isSoundSyntaxEnabled = !isSoundSyntaxEnabled;
    const config = vscode.workspace.getConfiguration("soundSyntax");
    await config.update(
      "enable",
      isSoundSyntaxEnabled,
      vscode.ConfigurationTarget.Global,
    );

    vscode.window.showInformationMessage(
      `Sound Syntax ${isSoundSyntaxEnabled ? "enabled" : "disabled"}!`,
    );
  });

  vscode.commands.registerCommand(
    "soundSyntax.toggleNotification",
    async () => {
      const config = vscode.workspace.getConfiguration("soundSyntax");
      const notificationMessage = config.get("notificationMessage", false);
      await config.update(
        "notificationMessage",
        !notificationMessage,
        vscode.ConfigurationTarget.Global,
      );

      vscode.window.showInformationMessage(
        `Notification message ${
          !notificationMessage ? "enabled" : "disabled"
        }!`,
      );
    },
  );

  vscode.commands.registerCommand("soundSyntax.setVolume", async () => {
    const volume = await vscode.window.showInputBox({
      placeHolder: "Enter volume level (1-100)",
    });

    if (volume) {
      const config = vscode.workspace.getConfiguration("soundSyntax");
      return config.update("volume", volume, vscode.ConfigurationTarget.Global);
    }
  });

  vscode.commands.registerCommand("soundSyntax.tokenSettings", async () => {
    const config = vscode.workspace.getConfiguration("soundSyntax");
    const tokens = config.get("tokens") as ITokenConfiguration[];
    const tokenLabels = tokens.map((token) => token.tokenLabel);

    const selectedOption = await vscode.window.showQuickPick(
      [...tokenLabels, "Create new token..."],
      { placeHolder: "Select an existing token or create a new one" },
    );

    if (selectedOption === "Create new token...") {
      await createNewToken(tokens);
    } else if (selectedOption) {
      const token = tokens.find((t) => t.tokenLabel === selectedOption);
      if (token) {
        await configureExistingToken(token, tokens);
      } else {
        showMessage("Token not found");
      }
    }
  });
}

async function updateTokensConfig(tokens: ITokenConfiguration[]) {
  const config = vscode.workspace.getConfiguration("soundSyntax");
  await config.update("tokens", tokens, vscode.ConfigurationTarget.Global);
}

function showMessage(message: string) {
  vscode.window.showInformationMessage(message);
}

async function createNewToken(tokens: ITokenConfiguration[]): Promise<void> {
  const newTokenLabel = await vscode.window.showInputBox({
    placeHolder: "Enter new token name",
  });

  if (newTokenLabel) {
    let token = tokens.find((t) => t.tokenLabel === newTokenLabel);
    if (token) {
      return showMessage(`Token "${newTokenLabel}" already exists`);
    }
    token = {
      tokenLabel: newTokenLabel,
      enableSound: true,
      enableInformation: true,
    };
    tokens.push(token);
    await updateTokensConfig(tokens);
    showMessage(`New token "${newTokenLabel}" created`);
  }
}

async function configureExistingToken(
  token: ITokenConfiguration,
  tokens: ITokenConfiguration[],
) {
  showMessage(`Selected token: "${token.tokenLabel}"`);

  const tokenConfigOption = await vscode.window.showQuickPick([
    { label: "Enable sound", description: "Enable sound for this token" },
    {
      label: "Enable information",
      description: "Enable information for this token",
    },
    {
      label: "Edit token sound path",
      description: "Edit token sound configuration",
    },
    {
      label: "Edit token information text",
      description: "Edit token information notification text",
    },
  ]);

  if (tokenConfigOption) {
    switch (tokenConfigOption.label) {
      case "Enable sound": {
        token.enableSound = !token.enableSound;
        showMessage(
          `${token.tokenLabel} sound has been ${token.enableSound ? "enabled" : "disabled"}`,
        );
        break;
      }
      case "Enable information": {
        token.enableInformation = !token.enableInformation;
        showMessage(
          `${token.tokenLabel} information has been ${token.enableInformation ? "enabled" : "disabled"}`,
        );
        break;
      }
      case "Edit token sound path": {
        const audioFilePath = await vscode.window.showInputBox({
          placeHolder: "Enter audio file path",
        });
        token.audioFilePath = audioFilePath || undefined;
        showMessage(`${token.tokenLabel} sound path has been updated`);
        break;
      }
      case "Edit token information notification text": {
        const overrideInformationText = await vscode.window.showInputBox({
          placeHolder: "Enter override information notification text",
        });
        if (overrideInformationText) {
          token.overrideInformationText = overrideInformationText;
        }
        showMessage(
          `${token.tokenLabel} information notification text has been updated`,
        );
        break;
      }
    }

    await updateTokensConfig(tokens);
  }
}

export function deactivate() {}
