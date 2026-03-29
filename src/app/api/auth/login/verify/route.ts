import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { fromBase64URL, toUint8Array, toBase64URL } from '@/lib/encoding';

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, challenge, authenticationResponse } = body;

    if (!username || !challenge || !authenticationResponse) {
      return NextResponse.json({ error: 'Missing required login data' }, { status: 400 });
    }

    // 1. Fetch and consume one-time challenge from DB (Vercel Hardening)
    const { data: challengeData, error: challengeFetchError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('type', 'authentication')
      .single();

    if (challengeFetchError || !challengeData) {
      console.warn('[Login] Invalid or missing challenge');
      return NextResponse.json({ error: 'Handshake invalid. Please try again.' }, { status: 401 });
    }

    // Security: Challenge must not be expired
    if (new Date(challengeData.expires_at) < new Date()) {
      await supabaseAdmin.from('challenges').delete().eq('id', challengeData.id);
      return NextResponse.json({ error: 'Handshake expired. Please refresh.' }, { status: 401 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Find the passkey by string ID (DIRECT STRING MATCH)
    const stringId = authenticationResponse.id;
    const { data: passkey, error: pkError } = await supabaseAdmin
      .from('passkeys')
      .select('id, public_key, counter, user_id')
      .eq('id', stringId) // String-to-string match logic
      .single();

    if (pkError || !passkey) {
      console.error('[Login] Passkey not found for string ID:', pkError?.message);
      return NextResponse.json({ 
        error: 'Biometric key not recognized.',
        debug_hint: pkError?.message || 'ID Character Mismatch in DB'
      }, { status: 404 });
    }

    // 3. Verify profile link
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username, wallet_address')
      .eq('id', passkey.user_id)
      .single();

    if (!profile || profile.username !== cleanUsername) {
      return NextResponse.json({ 
        error: 'Username does not match registered key',
        debug_hint: `Profile username: ${profile?.username}, attempted: ${cleanUsername}`
      }, { status: 401 });
    }

    // 4. Verify WebAuthn authentication (BEYOND STABLE: CHARACTER-PERFECT)
    let verification;
    try {
      let pubKeyString = passkey.public_key;
      // Database BYTEA fallback for hex strings
      if (typeof pubKeyString === 'string' && pubKeyString.startsWith('\\x')) {
        pubKeyString = Buffer.from(pubKeyString.slice(2), 'hex').toString('utf8');
      }
      const publicKeyBytes = fromBase64URL(pubKeyString);

      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: authenticationResponse.id, // ✅ GUARANTEED BASE64URL STRING FROM BROWSER
          publicKey: publicKeyBytes as any, // ✅ RAW BYTES FOR LIBRARY
          counter: Number(passkey.counter),
        },
        requireUserVerification: false,
      });
    } catch (vErr: any) {
      console.error('[Login] WebAuthn verify failed:', vErr.message);
      return NextResponse.json({ 
        error: 'Biometric verification failed', 
        debug_hint: process.env.NODE_ENV === 'development' ? vErr.message : undefined 
      }, { status: 400 });
    }

    // 5. ONE-TIME USE: Consume challenge immediately
    await supabaseAdmin.from('challenges').delete().eq('id', challengeData.id);

    if (verification.verified && verification.authenticationInfo) {
      const { newCounter } = verification.authenticationInfo;

      // 6. Counter Security (Replay Attack Protection)
      // Note: Single-device authenticators like Apple FaceID / Windows Hello always return 0. Only check if newCounter > 0.
      if (newCounter > 0 && newCounter <= Number(passkey.counter)) {
        console.error('[Login] SECURITY ALERT: Counter regression!', { newCounter, stored: passkey.counter });
        return NextResponse.json({ error: 'Security violation: Probable cloned authenticator detected.' }, { status: 403 });
      }

      // 7. Update counter & last used
      await supabaseAdmin
        .from('passkeys')
        .update({ counter: newCounter, last_used_at: new Date().toISOString() })
        .eq('id', passkey.id);

      // Create session via Magic Link logic (Original requirement)
      const email = `${cleanUsername}@biovault.local`;
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${origin}/dashboard`
        }
      });

      if (linkError) throw new Error(`Auth Session Error: ${linkError.message}`);

      return NextResponse.json({ 
        verified: true,
        walletAddress: profile.wallet_address,
        redirectUrl: linkData.properties.action_link 
      });
    } else {
      return NextResponse.json({ error: 'Biometric verification returned false' }, { status: 401 });
    }
  } catch (err: any) {
    console.error('CRITICAL: Login verify failure:', err);
    return NextResponse.json({ 
      error: 'Unable to verify biometric login', 
      debug_hint: process.env.NODE_ENV === 'development' ? err.message : undefined 
    }, { status: 500 });
  }
}
