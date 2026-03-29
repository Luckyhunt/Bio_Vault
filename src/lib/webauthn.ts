// WebAuthn configuration for SimpleWebAuthn (VERCEL-ONLY HARDENED)
export const rpName = 'BioVault';

// Fixed Production Domain to eliminate RP ID/Origin mismatches
export const rpID = 'bio-vault-plum.vercel.app';
export const origin = 'https://bio-vault-plum.vercel.app';

// Note: This matches your Vercel Dashboard and eliminates localhost conflicts.
