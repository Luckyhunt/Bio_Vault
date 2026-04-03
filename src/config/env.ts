import { z } from 'zod';

/**
 * 🛡️ BioVault Environment & Config Layer (Elite Refined)
 * Uses Zod for schema validation and strict type safety.
 * Standardizes browser-safe (NEXT_PUBLIC_) and server-only variables.
 */

// --- 1. SCHEMAS -------------------------------------------------------------

const publicEnvSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  
  // WebAuthn / RP
  rpName: z.string().default('BioVault'),
  rpId: z.string().min(1),
  origin: z.string().url(),
  
  // Network / RPC
  rpcUrl: z.string().url(),
  bundlerRpcUrl: z.string().url(),
  pimlicoUrl: z.string().url(),
  explorerUrl: z.string().url(),
  explorerTxUrl: z.string().url(),
  entryPoint: z.string().startsWith('0x'),
  
  // External Links (Optional/Defaulted)
  githubUrl: z.string().url().default('https://github.com/Luckyhunt/Bio_Vault'),
});

const serverEnvSchema = z.object({
  supabaseServiceKey: z.string().min(1),
});

// --- 2. VALIDATION -----------------------------------------------------------

const vUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
const vOrigin = vUrl ? `https://${vUrl}` : undefined;

const rawPublic = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  rpName: process.env.NEXT_PUBLIC_RP_NAME || 'BioVault',
  rpId: process.env.NEXT_PUBLIC_RP_ID || vUrl || 'localhost',
  origin: process.env.NEXT_PUBLIC_ORIGIN || vOrigin || 'http://localhost:3000',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  bundlerRpcUrl: process.env.NEXT_PUBLIC_BUNDLER_RPC_URL,
  pimlicoUrl: process.env.NEXT_PUBLIC_PIMLICO_URL,
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL,
  explorerTxUrl: process.env.NEXT_PUBLIC_EXPLORER_TX_URL,
  entryPoint: process.env.NEXT_PUBLIC_ENTRYPOINT,
};

console.log('[Config Check] Raw Public Keys:', Object.keys(rawPublic).filter(k => !(rawPublic as any)[k]));

const _publicEnv = publicEnvSchema.safeParse(rawPublic);

const rawServer = {
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

console.log('[Config Check] Missing Server Keys:', Object.keys(rawServer).filter(k => !(rawServer as any)[k]));

const _serverEnv = serverEnvSchema.safeParse(rawServer);

if (!_publicEnv.success) {
  const errors = _publicEnv.error.flatten().fieldErrors;
  console.error('❌ [Config] Public Env Validation Failed:', JSON.stringify(errors, null, 2));
  if (typeof window === 'undefined') {
    throw new Error(`CRITICAL: Missing PUBLIC env variables: ${Object.keys(errors).join(', ')}`);
  }
}

if (!_serverEnv.success && typeof window === 'undefined') {
  const errors = _serverEnv.error.flatten().fieldErrors;
  console.error('❌ [Config] Server Env Validation Failed:', JSON.stringify(errors, null, 2));
  throw new Error(`CRITICAL: Missing SERVER env variables: ${Object.keys(errors).join(', ')}`);
}

// --- 3. EXPORTS --------------------------------------------------------------

export const PUBLIC_CONFIG = _publicEnv.success ? _publicEnv.data : ({} as z.infer<typeof publicEnvSchema>);
export const SERVER_CONFIG = _serverEnv.success ? _serverEnv.data : ({} as z.infer<typeof serverEnvSchema>);

export const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Validates the configuration at runtime.
 * Best called in the Root Layout or app initialization.
 */
export function validateEnv() {
  if (!_publicEnv.success) {
    console.warn('⚠️ [Config] Public configuration is incomplete. Check .env.local');
  }
  if (typeof window === 'undefined' && !_serverEnv.success) {
    console.error('🚨 [Config] SERVER configuration is INVALID.');
  }
}
