/**
 * WEB-AUTHN ENCODING VACCINE
 * Ensures zero-corruption binary ↔ text conversion for public keys
 * specifically for Vercel/Node edge environments.
 */

/**
 * Converts a Uint8Array (binary key) to a strict Base64URL string (text DB column)
 * No padding, - instead of +, _ instead of /
 */
export function toBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Converts a Base64URL string back to a Uint8Array for biometric verification
 */
export function fromBase64URL(base64url: string): Uint8Array {
  // Add padding back if necessary
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    + '==='.slice((base64url.length + 3) % 4);

  return new Uint8Array(Buffer.from(base64, 'base64'));
}
