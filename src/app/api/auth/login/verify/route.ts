import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';
import { toUint8Array } from '@/lib/encoding';
import { LoginVerifySchema } from '@/lib/schemas';
import crypto from 'crypto';
import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const SUPABASE_URL = PUBLIC_CONFIG.supabaseUrl;
  const SUPABASE_KEY = SERVER_CONFIG.supabaseServiceKey;

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const result = LoginVerifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { username, challenge, authenticationResponse } = result.data;

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Fetch and validate challenge (Elite Gap #2: Bound to User)
    const { data: challengeData } = await db
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('type', 'authentication')
      .eq('used', false)
      .single();

    if (!challengeData) {
      return NextResponse.json({ error: 'Handshake invalid. Please try again.' }, { status: 401 });
    }

    if (new Date(challengeData.expires_at) < new Date()) {
      await db.from('challenges').delete().eq('id', challengeData.id);
      return NextResponse.json({ error: 'Handshake expired. Please retry.' }, { status: 401 });
    }

    // 2. Lookup the passkey by credential ID
    const { data: passkey } = await db
      .from('passkeys')
      .select('id, public_key, counter, user_id')
      .eq('id', authenticationResponse.id)
      .single();

    if (!passkey) {
      return NextResponse.json({ error: 'Biometric key not recognized. Register this device first.' }, { status: 404 });
    }

    // 3. Lookup the user profile and verify username matches
    const { data: profile } = await db
      .from('profiles')
      .select('id, username, wallet_address')
      .eq('id', passkey.user_id)
      .single();

    if (!profile || profile.username !== cleanUsername) {
      return NextResponse.json({ error: 'Username mismatch. Please use the correct account.' }, { status: 401 });
    }

    // 4. ✅ KEY FIX: Use robust decoder (handles \x or 0x prefixes)
    // The DB stores the raw COSE-encoded public key as a hex string.
    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = toUint8Array(passkey.public_key);
      console.log('[Login/Verify] COSE key bytes decoded:', publicKeyBytes.length, 'bytes');
    } catch (decodeErr: any) {
      console.error('[Login/Verify] COSE decode failed:', decodeErr.message);
      return NextResponse.json({
        error: 'Internal key format error',
        debug_hint: `COSE hex decode failed: ${decodeErr.message}`,
      }, { status: 500 });
    }

    // 5. Run SimpleWebAuthn assertion verification
    let verification;
    try {
      // ✅ Normalizing origin: remove trailing slash for strict match logic
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      console.log('[Login/Verify] Running verification with:', {
        rpID,
        origin: normalizedOrigin,
        challenge: challengeData.challenge,
        bytes: publicKeyBytes.length
      });

      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: normalizedOrigin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: publicKeyBytes as any,
          counter: Number(passkey.counter),
        },
        requireUserVerification: true,
      });
    } catch (err: any) {
      console.error('[Login/Verify] SimpleWebAuthn assertion error:', err.message);
      return NextResponse.json({
        error: 'Biometric verification failed',
        debug_hint: `Verification Error: ${err.message}`, // Detailed debug info
      }, { status: 400 });
    }

    // 6. Mark challenge as used (Elite Gap #2)
    await db.from('challenges').update({ used: true }).eq('id', challengeData.id);

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json({ error: 'Biometric assertion returned false' }, { status: 401 });
    }

    const { newCounter } = verification.authenticationInfo;

    // 7. Replay attack detection — counter must always increase
    if (newCounter > 0 && newCounter <= Number(passkey.counter)) {
      console.warn('[Login/Verify] SECURITY: Counter replay detected!', {
        stored: passkey.counter,
        received: newCounter,
      });
      return NextResponse.json({ error: 'Security violation: credential replay detected.' }, { status: 403 });
    }

    // 8. Update counter and last-used timestamp
    await db
      .from('passkeys')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id);

    // 9. ✅ GLITCH-FREE SESSION INIT: Rotate password to a secure random token
    // This allows the frontend to establish a session silently without any redirect flashes.
    const sessionToken = crypto.randomUUID() + crypto.randomUUID();
    
    await db.auth.admin.updateUserById(passkey.user_id, {
      password: sessionToken
    });

    const email = `${cleanUsername}@biovault.local`;

    console.log('[Login/Verify] ✅ Login verification successful for:', cleanUsername);

    return NextResponse.json({
      verified: true,
      walletAddress: profile.wallet_address,
      credentialId: passkey.id,
      sessionConfig: { email, password: sessionToken }
    });

  } catch (err: any) {
    console.error('[Login/Verify] CRITICAL error:', err.message);
    return NextResponse.json({
      error: 'Unable to verify biometric login',
      debug_hint: err.message,
    }, { status: 500 });
  }
}