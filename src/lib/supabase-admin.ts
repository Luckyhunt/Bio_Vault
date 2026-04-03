import { createClient } from '@supabase/supabase-js';
import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';

/**
 * 🔐 Supabase Admin Client (Service Role)
 * Bypasses Row Level Security (RLS). 
 * Use ONLY in Server Components or API Routes.
 */

export const supabaseAdmin = createClient(
  PUBLIC_CONFIG.supabaseUrl, 
  SERVER_CONFIG.supabaseServiceKey
);
