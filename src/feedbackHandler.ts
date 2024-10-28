import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import { ITokenConfiguration } from "./interfaces/ITokenConfiguration";
import { AudioPlayer } from "./audioplayer";

export class FeedbackHandler {
    private static audioPlayer = AudioPlayer.getInstance();
    private static defaultSoundPath = path.resolve(__dirname, `../sounds/default.mp3`);

    public static async handleTokenType(tokenType: string) {
        const tokenConfig = this.getTokenConfiguration(tokenType);
        
        if (!tokenConfig) {
            await this.playDefaultSound();
            return;
        }

        if (tokenConfig.enableInformation) {
            const message = tokenConfig.overrideInformationText || tokenType;
            vscode.window.showInformationMessage(message);
        }

        if (tokenConfig.enableSound) {
            const soundPath = this.resolveSoundPath(tokenConfig, tokenType);
            if (soundPath) {
                await this.playSound(soundPath);
            }
        }
    }

    private static getTokenConfiguration(tokenType: string): ITokenConfiguration | undefined {
        const config = vscode.workspace.getConfiguration('soundSyntax');
        const tokens = config.get<ITokenConfiguration[]>('tokens');
        return tokens?.find(token => token.tokenLabel === tokenType);
    }

    private static resolveSoundPath(tokenConfig: ITokenConfiguration, tokenType: string): string | null {
        if (tokenConfig.audioFilePath) {
            return tokenConfig.audioFilePath;
        }

        const specificSoundPath = path.resolve(__dirname, `../sounds/${tokenType}.mp3`);
        if (fs.existsSync(specificSoundPath)) {
            return specificSoundPath;
        }

        return this.defaultSoundPath; 
    }

    private static async playDefaultSound() {
        await this.audioPlayer.playSound(this.defaultSoundPath).catch((error: Error) => {
            vscode.window.showWarningMessage(`Error playing default sound: ${error.message}`);
        });
    }

    private static async playSound(soundPath: string) {
        await this.audioPlayer.playSound(soundPath).catch((error: Error) => {
            vscode.window.showWarningMessage(`Error playing sound: ${error.message}`);
        });
    }
}