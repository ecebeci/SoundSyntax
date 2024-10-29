import * as vscode from "vscode";
import * as fs from "node:fs";
import { AudioContext } from "node-web-audio-api";

const audioContext: AudioContext = new AudioContext();

export async function playSound(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Sound file not found: ${filePath}`);
  }

  try {
    const audioBuffer = await loadAudioBuffer(filePath);
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const volume = getVolume();
    gainNode.gain.value = volume ? volume / 100 : 1;
    gainNode.connect(audioContext.destination);
    source.connect(gainNode);
    source.buffer = audioBuffer;
    source.start(0); // Play the sound from the beginning
  } catch (error: unknown) {
    throw new Error(`AudioPlayer: ${error}`);
  }
}

async function loadAudioBuffer(filePath: string): Promise<AudioBuffer> {
  const fileBuffer = fs.readFileSync(filePath);
  const audioDecode = (await import("audio-decode")).default;
  const decoded = await audioDecode(fileBuffer.buffer);
  const audioBuffer = audioContext.createBuffer(
    decoded.numberOfChannels,
    decoded.length,
    decoded.sampleRate,
  );

  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    audioBuffer.copyToChannel(decoded.getChannelData(channel), channel);
  }
  return audioBuffer;
}

function getVolume(): number {
  const config = vscode.workspace.getConfiguration("soundSyntax");
  return config.get<number>("volume") || 100;
}
