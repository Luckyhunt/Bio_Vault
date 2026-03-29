import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { rpID } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';
import { UsernameSchema } from '@/lib/schemas';

// 🔥 UNIVERSAL BINARY ADAPTER (CRITICAL FIX)
function toUint8ArraySafe(data: any): Uint8Array {
  if (!data) throw new Error("No data provided");

  // Already Uint8Array
  if (data instanceof Uint8Array) return data;

  // Base64 string (Supabase BYTEA default)
  if (typeof data === "string") {
    return Uint8Array.from(Buffer.from(data, "base64"));
  }

  // Buffer-like object
  if (data.type === "Buffer" && Array.isArray(data.data)) {
    return new Uint8Array(data.data);
  }

  throw new Error("Unsupported binary format");
}

// 🔒 STRICT TRANSPORT SANITIZER (Prevents SimpleWebAuthn v13 Crashes)
const VALID_TRANSPORTS = ['usb', 'nfc', 'ble', 'internal', 'hybrid'] as const;

function sanitizeTransports(transports: any): any[] {
  if (!Array.isArray(transports)) return [];
  return transports.filter(t => VALID_TRANSPORTS.includes(t as any));
}

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
      try {
        const idBuffer = toUint8ArraySafe(pk.id);

        if (!idBuffer || idBuffer.length < 16) {
          throw new Error("Invalid length");
        }

        validCredentials.push({
          id: idBuffer,
          type: 'public-key' as const,
          transports: sanitizeTransports(pk.transports),
        });

      } catch (err: any) {
        console.warn("[SKIP BAD KEY]", err.message);
        invalidCount++;
      }
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
        error: 'Failed to generate auth options',
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
          user_id_hint: cleanUsername,
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
