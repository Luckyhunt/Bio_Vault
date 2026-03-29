/**
 * WEB-AUTHN ENCODING MANIFESTO
 * Alignment with absolute production standards for binary ↔ text.
 */

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
