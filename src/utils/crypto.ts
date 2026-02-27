/**
 * Crypto Utility
 * Handles AES-256-GCM encryption and decryption using Web Crypto API.
 */

const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

const DEFAULT_KEY = 'steganopro-internal-system-key-2026';

export async function compressData(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(data).body?.pipeThrough(new CompressionStream('gzip'));
  if (!stream) return data;
  const compressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(compressed);
}

export async function decompressData(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(data).body?.pipeThrough(new DecompressionStream('gzip'));
  if (!stream) return data;
  try {
    const decompressed = await new Response(stream).arrayBuffer();
    return new Uint8Array(decompressed);
  } catch {
    return data; // Fallback if not compressed
  }
}

export async function encryptData(data: string | Uint8Array, password = DEFAULT_KEY, compress = true): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  let rawData = typeof data === 'string' ? encoder.encode(data) : data;
  
  if (compress) {
    rawData = await compressData(rawData);
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    rawData
  );

  // Combine Salt + IV + Encrypted Data
  // Added a 1-byte flag at the beginning for compression (1 = yes, 0 = no)
  const combined = new Uint8Array(1 + salt.length + iv.length + encrypted.byteLength);
  combined[0] = compress ? 1 : 0;
  combined.set(salt, 1);
  combined.set(iv, 1 + salt.length);
  combined.set(new Uint8Array(encrypted), 1 + salt.length + iv.length);

  return combined;
}

export async function decryptData(combined: Uint8Array, password = DEFAULT_KEY): Promise<{ data: Uint8Array; isText: boolean }> {
  const encoder = new TextEncoder();
  const isCompressed = combined[0] === 1;
  const salt = combined.slice(1, 1 + SALT_SIZE);
  const iv = combined.slice(1 + SALT_SIZE, 1 + SALT_SIZE + IV_SIZE);
  const data = combined.slice(1 + SALT_SIZE + IV_SIZE);

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  let resultData = new Uint8Array(decrypted);
  if (isCompressed) {
    resultData = await decompressData(resultData);
  }

  // Try to detect if it's text
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(resultData);
    return { data: resultData, isText: true };
  } catch {
    return { data: resultData, isText: false };
  }
}

