import * as fs from "node:fs";
import { AudioContext } from "node-web-audio-api";

export class AudioPlayer {
  private static instance: AudioPlayer;
  private audioContext: AudioContext;

  private constructor() {
    this.audioContext = new AudioContext();
  }

  public static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  public async playSound(filePath: string, volume: number): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Sound file not found: ${filePath}`);
    }

    try {
      const audioBuffer = await this.loadAudioBuffer(filePath);
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume ? volume / 100 : 1;
      gainNode.connect(this.audioContext.destination);
      source.connect(gainNode);
      source.buffer = audioBuffer;
      source.start(0); // Play the sound from the beginning
    } catch (error: unknown) {
      throw new Error(`AudioPlayer: ${error}`);
    }
  }

  private async loadAudioBuffer(filePath: string): Promise<AudioBuffer> {
    const fileBuffer = fs.readFileSync(filePath);
    const audioDecode = (await import("audio-decode")).default;
    const decoded = await audioDecode(fileBuffer.buffer);
    const audioBuffer = this.audioContext.createBuffer(
      decoded.numberOfChannels,
      decoded.length,
      decoded.sampleRate,
    );

    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      audioBuffer.copyToChannel(decoded.getChannelData(channel), channel);
    }
    return audioBuffer;
  }
}
