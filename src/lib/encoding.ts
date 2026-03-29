/**
 * Converts a Uint8Array (binary key) to a strict Base64URL string
 * Used primarily for the initial handshake JSON.
 */
export function toBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64url');
}

/**
 * Converts a Base64URL string back to a Uint8Array
 * THE MANIFESTO FIX: Robust 4-character boundary alignment.
 */
export function fromBase64URL(input: string): Uint8Array {
  // Reconstruct standard Base64 with mandatory padding logic
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + (4 - (input.length % 4)) % 4, '=');

  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * THE UNIVERSAL BINARY ADAPTER (DEFENSIVE)
 * Standardizing on a single way to ingest binary from any source (Supabase, Browser, etc.)
 */
export function toUint8Array(data: any): Uint8Array {
  if (!data) throw new Error("Invalid binary data: null or undefined");

  // Case 1: Already a Uint8Array
  if (data instanceof Uint8Array) return data;

  // Case 2: Base64 string from Supabase BYTEA string-serialization
  if (typeof data === "string") {
    return Uint8Array.from(Buffer.from(data, "base64"));
  }

  // Case 3: Buffer JSON-serialization { type: 'Buffer', data: [...] }
  if (data.type === "Buffer" && Array.isArray(data.data)) {
    return new Uint8Array(data.data);
  }

  // Case 4: Node.js Buffer object
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }

  throw new Error(`Unsupported binary format: ${typeof data}`);
}
