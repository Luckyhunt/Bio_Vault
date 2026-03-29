import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { rpID } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { UsernameSchema } from '@/lib/schemas';
import { toUint8Array, toBase64URL } from '@/lib/encoding';

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const result = UsernameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { username } = result.data;
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Find user via profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .single();

    if (profileError || !profile) {
      console.warn(`Login attempt for unknown user: ${cleanUsername}`);
      return NextResponse.json({ error: 'Vault not found. Please check your username.' }, { status: 404 });
    }

    // 2. Fetch their registered passkeys (linked via user_id = profile.id which = auth.users.id)
    const { data: passkeys, error: pkError } = await supabaseAdmin
      .from('passkeys')
      .select('id, transports')
      .eq('user_id', profile.id);

    if (pkError || !passkeys || passkeys.length === 0) {
      console.warn(`No passkeys found for user: ${cleanUsername}`);
      return NextResponse.json({ error: 'No biometric key found for this vault.' }, { status: 404 });
    }

    // DIAGNOSTIC LOGGING: Confirm binary types before hand-off
    console.log(`[Login Options] Passkeys found: ${passkeys.length}`);
    console.log(`[Login Options] Type of first ID: ${typeof passkeys[0].id}`);

    // 3. Generate authentication options
    try {
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: passkeys.map((pk: any) => ({
          // PASS RAW BYTES: The library handles JSON serialization natively
          id: toUint8Array(pk.id),
          type: 'public-key' as const,
          transports: pk.transports || [],
        })) as any,
        userVerification: 'required',
      });

      // 4. Store challenge in the database for session-less verification
      const { error: challengeError } = await supabaseAdmin
        .from('challenges')
        .insert({
          challenge: options.challenge,
          type: 'authentication',
          user_id_hint: cleanUsername,
          expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes
        });

      if (challengeError) {
        console.error('Challenge DB sync failure:', challengeError);
        throw new Error(`Vault Handshake Error: ${challengeError.message}`);
      }

      console.log(`[Login] Challenge persisted for ${cleanUsername}`);
      return NextResponse.json(options);
    } catch (binaryErr: any) {
      console.error('[Login Options] Binary Adapter Failure:', binaryErr.message);
      return NextResponse.json({ 
        error: 'Vault hardware mismatch', 
        debug_hint: binaryErr.message 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('CRITICAL: Login options failure:', error);
    return NextResponse.json({ 
      error: 'Unable to initiate biometric login', 
      debug_hint: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
