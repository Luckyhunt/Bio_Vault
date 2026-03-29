import { decodeCredentialPublicKey } from '@simplewebauthn/server/helpers';

/**
 * Converts stored COSE public key hex to PKCS (raw uncompressed points)
 * for Smart Wallet address derivation.
 */
export function getPKCSFromCOSE(coseHex: string): `0x${string}` {
  // Handle both 0x-prefixed and non-prefixed hex
  const hex = coseHex.startsWith('0x') ? coseHex.slice(2) : coseHex;
  const coseBuffer = Buffer.from(hex, 'hex');
  const struct = decodeCredentialPublicKey(coseBuffer) as unknown as Map<number, Uint8Array>;
  
  // Extract coordinates (x and y) from the COSE map
  const x = struct.get(-2);
  const y = struct.get(-3);

  if (!x || !y) {
    throw new Error('Invalid COSE Public Key: Missing x or y coordinates.');
  }

  // Prefix with 0x04 for uncompressed PKCS format (65 bytes)
  return `0x04${Buffer.from(x).toString('hex')}${Buffer.from(y).toString('hex')}`;
}

// Keep the old name as an alias for backward compatibility if needed, 
// but pointing to the new robust logic.
export function extractRawPublicKey(cosePublicKey: Uint8Array): string {
  return getPKCSFromCOSE(Buffer.from(cosePublicKey).toString('hex'));
}
