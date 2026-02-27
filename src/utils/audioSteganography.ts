/**
 * Audio Steganography Utility
 * Implements Chaotic Least Significant Bit (LSB) encoding and decoding for audio samples.
 */

class SeededRandom {
  private seed: number;
  constructor(seedStr: string) {
    this.seed = Array.from(seedStr).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const DEFAULT_SEED = 'steganopro-audio-chaotic-seed';

export const encodeAudioMessage = (
  audioBuffer: AudioBuffer,
  payload: Uint8Array,
  seed = DEFAULT_SEED
): AudioBuffer | null => {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const binaryPayload = bytesToBinary(payload);
  const payloadLength = binaryPayload.length;

  // Header: 32 bits for length
  const lengthBinary = payloadLength.toString(2).padStart(32, '0');
  const totalBits = lengthBinary + binaryPayload;

  const totalSamples = channels * length;
  if (totalBits.length > totalSamples) return null;

  // Chaotic Shuffle of sample indices
  const availableIndices = new Int32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) availableIndices[i] = i;

  if (seed) {
    const rng = new SeededRandom(seed);
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = availableIndices[i];
      availableIndices[i] = availableIndices[j];
      availableIndices[j] = temp;
    }
  }

  // Create a new AudioBuffer for the result
  const newBuffer = new AudioContext().createBuffer(
    channels,
    length,
    audioBuffer.sampleRate
  );

  // Copy original data and modify
  for (let channel = 0; channel < channels; channel++) {
    newBuffer.getChannelData(channel).set(audioBuffer.getChannelData(channel));
  }

  for (let i = 0; i < totalBits.length; i++) {
    const globalIndex = availableIndices[i];
    const channel = globalIndex % channels;
    const sampleIndex = Math.floor(globalIndex / channels);
    const bit = parseInt(totalBits[i]);

    const channelData = newBuffer.getChannelData(channel);
    let sample = channelData[sampleIndex];

    // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767) for LSB
    let intSample = Math.floor(sample * 32767);
    intSample = (intSample & 0xfffe) | bit;
    channelData[sampleIndex] = intSample / 32767;
  }

  return newBuffer;
};

export const decodeAudioMessage = (
  audioBuffer: AudioBuffer,
  seed = DEFAULT_SEED
): Uint8Array | null => {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const totalSamples = channels * length;

  const availableIndices = new Int32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) availableIndices[i] = i;

  if (seed) {
    const rng = new SeededRandom(seed);
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = availableIndices[i];
      availableIndices[i] = availableIndices[j];
      availableIndices[j] = temp;
    }
  }

  // 1. Extract Length
  let binaryLength = '';
  for (let i = 0; i < 32; i++) {
    const globalIndex = availableIndices[i];
    const channel = globalIndex % channels;
    const sampleIndex = Math.floor(globalIndex / channels);
    const sample = audioBuffer.getChannelData(channel)[sampleIndex];
    const intSample = Math.floor(sample * 32767);
    binaryLength += (intSample & 1).toString();
  }
  const payloadLength = parseInt(binaryLength, 2);

  if (isNaN(payloadLength) || payloadLength <= 0 || payloadLength > totalSamples - 32) {
    return null;
  }

  // 2. Extract Payload
  let binaryPayload = '';
  for (let i = 32; i < 32 + payloadLength; i++) {
    const globalIndex = availableIndices[i];
    const channel = globalIndex % channels;
    const sampleIndex = Math.floor(globalIndex / channels);
    const sample = audioBuffer.getChannelData(channel)[sampleIndex];
    const intSample = Math.floor(sample * 32767);
    binaryPayload += (intSample & 1).toString();
  }

  return binaryToBytes(binaryPayload);
};

const bytesToBinary = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join('');
};

const binaryToBytes = (bin: string): Uint8Array => {
  const bytes = new Uint8Array(bin.length / 8);
  for (let i = 0; i < bin.length; i += 8) {
    bytes[i / 8] = parseInt(bin.slice(i, i + 8), 2);
  }
  return bytes;
};

/**
 * Utility to convert AudioBuffer to WAV format
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferWav = new ArrayBuffer(length);
  const view = new DataView(bufferWav);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded for simplicity)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return new Blob([bufferWav], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};
