/**
 * WEB-AUTHN ENCODING MANIFESTO
 * Implementation of strict padding and native Buffer mapping.
 */

/**
 * Converts a Uint8Array (binary key) to a strict Base64URL string
 */
export function toBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // Strict regex for padding removal
}

/**
 * Converts a Base64URL string back to a Uint8Array
 * THE MANIFESTO FIX: Ensures 4-character boundary alignment with manual padding.
 */
export function fromBase64URL(input: string): Uint8Array {
  // Reconstruct standard Base64 with mandatory padding
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + (4 - (input.length % 4)) % 4, '=');

  return new Uint8Array(Buffer.from(base64, 'base64'));
}
