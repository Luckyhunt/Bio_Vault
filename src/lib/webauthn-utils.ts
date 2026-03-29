/**
 * BioVault WebAuthn Utilities
 * Handles low-level cryptographic conversions between COSE and EVM formats.
 */

export function extractRawPublicKey(cosePublicKey: Uint8Array): string {
  const hex = Buffer.from(cosePublicKey).toString('hex');
  
  // COSE P-256 Public Key Map structure:
  // Key -2 (X-coordinate): 0x21
  // Key -3 (Y-coordinate): 0x22
  // We look for the 32-byte byte string prefix (0x58 0x20) following these keys.
  
  const xSearch = '215820'; // Tag -2, followed by 32 bytes
  const ySearch = '225820'; // Tag -3, followed by 32 bytes
  
  const xStart = hex.indexOf(xSearch);
  const yStart = hex.indexOf(ySearch);
  
  if (xStart === -1 || yStart === -1) {
    throw new Error('Invalid COSE Public Key: Could not locate P-256 coordinates.');
  }
  
  const x = hex.substring(xStart + 6, xStart + 6 + 64);
  const y = hex.substring(yStart + 6, yStart + 6 + 64);
  
  return `0x${x}${y}`;
}
