// WebAuthn configuration for SimpleWebAuthn
export const rpName = process.env.RP_NAME || 'BioVault';

// Production Vercel domain or local fallback
export const rpID = (process.env.RP_ID || 
  (process.env.NEXT_PUBLIC_VERCEL_URL ? process.env.NEXT_PUBLIC_VERCEL_URL.split('://').pop() : 'localhost')) as string;

export const origin = (process.env.ORIGIN || 
  (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')) as string;

// Note: Ensure these match your Vercel Dashboard Environment Variables exactly.
