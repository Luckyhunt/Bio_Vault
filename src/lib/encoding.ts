/**
 * WEB-AUTHN ENCODING RESTORATION
 * Uses native Node.js 'base64url' for 100% cryptographic accuracy.
 */

/**
 * Converts a Uint8Array (binary key) to a strict Base64URL string
 * No manual replacement or padding needed — uses native 'base64url' encoding.
 */
export function toBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64url');
}

/**
 * Converts a Base64URL string back to a Uint8Array for biometric verification
 */
export function fromBase64URL(input: string): Uint8Array {
  // Native 'base64url' decoding correctly handles missing padding of 4-character boundaries.
  return new Uint8Array(Buffer.from(input, 'base64url'));
}
