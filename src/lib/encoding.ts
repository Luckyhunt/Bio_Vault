/**
 * WEB-AUTHN ENCODING MANIFESTO
 * Alignment with absolute production standards for binary ↔ text.
 */

/**
 * Converts a Uint8Array (binary key) to a strict Base64URL string
 * Uses the precise replace/strip pattern from the manifesto.
 */
export function toBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // Exact regex for trailing padding removal
}

/**
 * Converts a Base64URL string back to a Uint8Array for biometric verification
 * Uses the exact .padEnd formula for 100% reliable reconstruction.
 */
export function fromBase64URL(input: string): Uint8Array {
  // THE CRITICAL MANIFESTO PAD: Ensures 4-character boundary alignment
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + (4 - (input.length % 4)) % 4, '=');

  return new Uint8Array(Buffer.from(base64, 'base64'));
}
