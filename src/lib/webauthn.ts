// WebAuthn configuration for SimpleWebAuthn
export const rpName = process.env.RP_NAME || 'BioVault';
export const rpID = process.env.RP_ID || 'localhost';
export const origin = process.env.ORIGIN || 'http://localhost:3000';

// Note: These env vars should be in your .env.local
