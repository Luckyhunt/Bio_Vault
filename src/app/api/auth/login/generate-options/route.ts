import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { rpID } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';
import { LoginGenerateSchema, LoginVerifySchema } from '@/lib/schemas';
import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';



// 🔒 STRICT TRANSPORT SANITIZER (Prevents SimpleWebAuthn v13 Crashes)
const VALID_TRANSPORTS = ['usb', 'nfc', 'ble', 'internal', 'hybrid'] as const;

function sanitizeTransports(transports: any): any[] {
  if (!Array.isArray(transports)) return [];
  return transports.filter(t => VALID_TRANSPORTS.includes(t as any));
}

export async function POST(request: Request) {
  const SUPABASE_URL = PUBLIC_CONFIG.supabaseUrl;
  const SUPABASE_KEY = SERVER_CONFIG.supabaseServiceKey;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const result = LoginGenerateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { username } = result.data;
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    // 1. Get user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    // 2. Get passkeys
    const { data: passkeys, error: pkError } = await supabaseAdmin
      .from('passkeys')
      .select('id, transports')
      .eq('user_id', profile.id);

    if (pkError || !passkeys || passkeys.length === 0) {
      return NextResponse.json({ error: 'No passkeys found' }, { status: 404 });
    }

    // 3. SAFE credential conversion
    const validCredentials: any[] = [];
    let invalidCount = 0;

    for (const pk of passkeys) {
      if (!pk.id) {
        invalidCount++;
        continue;
      }
      
      let finalId = pk.id;
      // Safe fallback if Supabase ID column is still BYTEA, which returns hex instead of raw strings
      if (typeof pk.id === 'string' && pk.id.startsWith('\\x')) {
        finalId = Buffer.from(pk.id.slice(2), 'hex').toString('utf8');
      }

      console.log("[Login Options] Final ID for browser:", finalId);

      validCredentials.push({
        id: finalId, // ✅ STRICT EXACT BASE64URL STRING
        type: 'public-key' as const,
        transports: sanitizeTransports(pk.transports),
      });
    }

    console.log("PASSKEY DEBUG:", {
      total: passkeys.length,
      valid: validCredentials.length,
      invalid: invalidCount,
    });

    if (validCredentials.length === 0) {
      return NextResponse.json({
        error: 'No valid passkeys found',
      }, { status: 400 });
    }

    // 🔥 SAFE WRAPPER (prevents crash)
    let options;
    try {
      options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: validCredentials,
        userVerification: 'required',
      });
    } catch (err: any) {
      console.error("OPTIONS GENERATION FAILED:", err);
      return NextResponse.json({
        error: `Failed to generate auth options: ${err.message}`, // Surface exact crash reason
        debug_hint: err.message,
      }, { status: 500 });
    }

    // 4. SAFE challenge insert
    try {
      const { error: challengeError } = await supabaseAdmin
        .from('challenges')
        .insert({
          challenge: options.challenge,
          type: 'authentication',
          user_id: profile.id, // ✅ SECURITY: Bind challenge to unique user profile
          used: false,
          expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
        });

      if (challengeError) {
        console.error("CHALLENGE INSERT FAILED:", challengeError);
        return NextResponse.json({
          error: 'Challenge storage failed',
          debug_hint: challengeError.message,
        }, { status: 500 });
      }

    } catch (err: any) {
      console.error("CHALLENGE ERROR:", err);
      return NextResponse.json({
        error: 'Challenge handling failed',
        debug_hint: err.message,
      }, { status: 500 });
    }

    return NextResponse.json(options);

  } catch (error: any) {
    console.error("FINAL CRASH:", error);
    return NextResponse.json({
      error: 'Unable to initiate biometric login',
      debug_hint: error.message,
    }, { status: 500 });
  }
}
