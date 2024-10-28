import * as vscode from "vscode";
import path from "node:path";
import fs from "node:fs";
import type { ITokenConfiguration } from "./interfaces/ITokenConfiguration";
import { AudioPlayer } from "./audioPlayer";

export class FeedbackHandler {
  private static audioPlayer = AudioPlayer.getInstance();
  private static defaultSoundPath = path.resolve(
    __dirname,
    "../sounds/default.mp3",
  );

  public static async handleTokenType(tokenType: string) {
    const tokenConfig = FeedbackHandler.getTokenConfiguration(tokenType);

    if (!tokenConfig) {
      await FeedbackHandler.playDefaultSound();
      return;
    }

    if (tokenConfig.enableInformation) {
      const message = tokenConfig.overrideInformationText || tokenType;
      vscode.window.showInformationMessage(message);
    }

    if (tokenConfig.enableSound) {
      const soundPath = FeedbackHandler.resolveSoundPath(
        tokenConfig,
        tokenType,
      );
      if (soundPath) {
        await FeedbackHandler.playSound(soundPath);
      }
    }
  }

  private static getTokenConfiguration(
    tokenType: string,
  ): ITokenConfiguration | undefined {
    const config = vscode.workspace.getConfiguration("soundSyntax");
    const tokens = config.get<ITokenConfiguration[]>("tokens");
    return tokens?.find((token) => token.tokenLabel === tokenType);
  }

  private static getVolume(): number {
    const config = vscode.workspace.getConfiguration("soundSyntax");
    return config.get<number>("volume") || 100;
  }

  private static resolveSoundPath(
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

    return FeedbackHandler.defaultSoundPath;
  }

  private static async playDefaultSound() {
    await FeedbackHandler.audioPlayer
      .playSound(FeedbackHandler.defaultSoundPath, FeedbackHandler.getVolume())
      .catch((error: Error) => {
        vscode.window.showWarningMessage(
          `Error playing default sound: ${error.message}`,
        );
      });
  }

  private static async playSound(soundPath: string) {
    await FeedbackHandler.audioPlayer
      .playSound(soundPath, FeedbackHandler.getVolume())
      .catch((error: Error) => {
        vscode.window.showWarningMessage(
          `Error playing sound: ${error.message}`,
        );
      });
  }
}
