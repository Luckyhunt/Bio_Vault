import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';
import { toUint8Array } from '@/lib/encoding';

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, challenge, authenticationResponse } = body;

    if (!username || !challenge || !authenticationResponse) {
      return NextResponse.json({ error: 'Missing required login data' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Fetch and validate challenge (check expiry)
    const { data: challengeData } = await db
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('type', 'authentication')
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
      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: publicKeyBytes as any,   // ← COSE bytes, as expected by the library
          counter: Number(passkey.counter),
        },
        requireUserVerification: true,
      });
    } catch (err: any) {
      console.error('[Login/Verify] SimpleWebAuthn assertion error:', err.message);
      return NextResponse.json({
        error: 'Biometric verification failed',
        debug_hint: err.message,
      }, { status: 400 });
    }

    // 6. Consume challenge immediately (one-time use)
    await db.from('challenges').delete().eq('id', challengeData.id);

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

    // 9. Generate a magic link for Supabase session creation
    const email = `${cleanUsername}@biovault.local`;

    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${origin}/dashboard` },
    });

    if (linkError) {
      console.error('[Login/Verify] Magic link generation failed:', linkError.message);
      throw new Error(linkError.message);
    }

    console.log('[Login/Verify] ✅ Login successful for:', cleanUsername, '| wallet:', profile.wallet_address);

    return NextResponse.json({
      verified: true,
      walletAddress: profile.wallet_address,
      credentialId: passkey.id,
      redirectUrl: linkData.properties.action_link,
    });

  } catch (err: any) {
    console.error('[Login/Verify] CRITICAL error:', err.message);
    return NextResponse.json({
      error: 'Unable to verify biometric login',
      debug_hint: err.message,
    }, { status: 500 });
  }
}