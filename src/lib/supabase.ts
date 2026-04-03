import { createClient } from '@supabase/supabase-js';
import { PUBLIC_CONFIG } from '@/config/env';

/**
 * 🌍 Public Supabase Client
 * Respects RLS and is safe for client-side usage.
 */

export const supabase = createClient(
  PUBLIC_CONFIG.supabaseUrl, 
  PUBLIC_CONFIG.supabaseAnonKey
);
