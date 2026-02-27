/**
 * Steganography Utility
 * Implements Chaotic Least Significant Bit (LSB) encoding and decoding.
 */

// Simple seeded PRNG for chaotic shuffling
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

const DEFAULT_SEED = 'steganopro-default-chaotic-seed';

export const encodeMessage = (
  imageData: ImageData,
  payload: Uint8Array,
  seed = DEFAULT_SEED
): ImageData | null => {
  const data = imageData.data;
  const binaryPayload = bytesToBinary(payload);
  const payloadLength = binaryPayload.length;

  // Header: 32 bits for length
  const lengthBinary = payloadLength.toString(2).padStart(32, '0');
  const totalBits = lengthBinary + binaryPayload;

  // Available bits (RGB only, skip Alpha)
  const availableIndices = [];
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 !== 0) availableIndices.push(i);
  }

  if (totalBits.length > availableIndices.length) return null;

  // Chaotic Shuffle if seed provided
  if (seed) {
    const rng = new SeededRandom(seed);
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }
  }

  const newImageData = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const newData = newImageData.data;

  for (let i = 0; i < totalBits.length; i++) {
    const pixelIndex = availableIndices[i];
    const bit = parseInt(totalBits[i]);
    newData[pixelIndex] = (newData[pixelIndex] & 0xfe) | bit;
  }

  return newImageData;
};

export const decodeMessage = (imageData: ImageData, seed = DEFAULT_SEED): Uint8Array | null => {
  const data = imageData.data;
  const availableIndices = [];
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 !== 0) availableIndices.push(i);
  }

  if (seed) {
    const rng = new SeededRandom(seed);
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }
  }

  // 1. Extract Length
  let binaryLength = '';
  for (let i = 0; i < 32; i++) {
    binaryLength += (data[availableIndices[i]] & 1).toString();
  }
  const payloadLength = parseInt(binaryLength, 2);

  if (isNaN(payloadLength) || payloadLength <= 0 || payloadLength > availableIndices.length - 32) {
    return null;
  }

  // 2. Extract Payload
  let binaryPayload = '';
  for (let i = 32; i < 32 + payloadLength; i++) {
    binaryPayload += (data[availableIndices[i]] & 1).toString();
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

// Legacy support for plain text
export const stringToUint8 = (str: string) => new TextEncoder().encode(str);
export const uint8ToString = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
