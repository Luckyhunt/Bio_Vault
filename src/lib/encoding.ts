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
 * THE DEEP BINARY EXCAVATOR (ROBUST)
 * Standardizing on a single recursive way to ingest binary from any source.
 * Handles: Base64, Hex (\x or x), JSON-stringified Buffers, and raw Uint8Arrays.
 */
export function toUint8Array(data: any): Uint8Array {
  if (!data) throw new Error("No binary data provided (null or undefined)");

  // Case 1: Already a Uint8Array
  if (data instanceof Uint8Array) return data;

  // Case 2: Node.js Buffer object
  if (Buffer.isBuffer(data)) return new Uint8Array(data);

  // Case 3: Buffer JSON-serialization { type: 'Buffer', data: [...] }
  if (data.type === "Buffer" && Array.isArray(data.data)) {
    return new Uint8Array(data.data);
  }

  // Case 4: String handling (Hex, Base64, or Base64URL)
  if (typeof data === "string") {
    // 4a. Supabase/Postgres Hex format (\x7b or x7b)
    if (data.startsWith('\\x') || data.startsWith('x')) {
      const hex = data.startsWith('\\x') ? data.slice(2) : data.slice(1);
      const decoded = Buffer.from(hex, 'hex');
      
      try {
        const str = decoded.toString('utf8');
        if (str.startsWith('{')) return toUint8Array(JSON.parse(str));
      } catch { /* Not JSON */ }
      
      return new Uint8Array(decoded);
    }

    // 4b. Base64URL Handling (Robust Detection)
    if (data.includes('-') || data.includes('_')) {
      return fromBase64URL(data);
    }

    // 4c. Standard Base64 Handling
    return Uint8Array.from(Buffer.from(data, "base64"));
  }

  throw new Error(`Unsupported binary format: ${typeof data}`);
}
