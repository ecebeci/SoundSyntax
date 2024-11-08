import * as vscode from "vscode";
import path from "node:path";
import fs from "node:fs";
import type { ITokenConfiguration } from "./interfaces/ITokenConfiguration";
import { playSound } from "./audioPlayer";

const defaultSoundPath = path.resolve(__dirname, "../sounds/default.mp3");

export async function handleTokenType(tokenType: string) {
  const tokenConfig = getTokenConfiguration(tokenType);
  const notificationMessagesAllowed = isNotificationMessagesAllowed();

  if (!tokenConfig) {
    await playSound(defaultSoundPath).catch((error: Error) => {
      vscode.window.showWarningMessage(
        `Error playing default sound: ${error.message}`,
      );
    });
    return;
  }

  if (notificationMessagesAllowed && tokenConfig.enableInformation) {
    const message = tokenConfig.overrideInformationText || tokenType;
    vscode.window.showInformationMessage(message);
  }

  if (tokenConfig.enableSound) {
    const soundPath = resolveSoundPath(tokenConfig, tokenType);
    if (soundPath) {
      await playSound(soundPath).catch((error: Error) => {
        vscode.window.showWarningMessage(
          `Error playing sound: ${error.message}`,
        );
      });
    }
  }
}

function getTokenConfiguration(
  tokenType: string,
): ITokenConfiguration | undefined {
  const config = vscode.workspace.getConfiguration("soundSyntax");
  const tokens = config.get<ITokenConfiguration[]>("tokens");
  return tokens?.find((token) => token.tokenLabel === tokenType);
}

function isNotificationMessagesAllowed(): boolean {
  const config = vscode.workspace.getConfiguration("soundSyntax");
  return config.get<boolean>("notificationMessage", false);
}

function resolveSoundPath(
  tokenConfig: ITokenConfiguration,
  tokenType: string,
): string | null {
  if (tokenConfig.audioFilePath) {
    return tokenConfig.audioFilePath;
  }

  const specificSoundPath = path.resolve(
    __dirname,
    `../sounds/${tokenType}.mp3`,
  );
  if (fs.existsSync(specificSoundPath)) {
    return specificSoundPath;
  }

  return defaultSoundPath;
}
