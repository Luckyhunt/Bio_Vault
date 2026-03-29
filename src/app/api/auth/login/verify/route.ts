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

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, challenge, authenticationResponse } = body;

    if (!username || !challenge || !authenticationResponse) {
      return NextResponse.json({ error: 'Missing required login data' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. SECURITY: Login Rate Limiting (Brute-Force Protection)
    const { count: recentAttempts } = await db
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'authentication')
      .gt('created_at', new Date(Date.now() - 60000).toISOString()); // Last 60s

    if (recentAttempts && recentAttempts > 5) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait 60 seconds.' }, { status: 429 });
    }

    // 2. Fetch and consume one-time challenge from DB
    const { data: challengeData, error: challengeFetchError } = await db
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('type', 'authentication')
      .single();

    if (challengeFetchError || !challengeData) {
      console.warn('[Login] Invalid or missing challenge');
      return NextResponse.json({ error: 'Handshake invalid. Please try again.' }, { status: 401 });
    }

    // 3. Find the passkey by string ID
    const stringId = authenticationResponse.id;
    const { data: passkey, error: pkError } = await db
      .from('passkeys')
      .select('id, public_key, counter, user_id')
      .eq('id', stringId)
      .single();

    if (pkError || !passkey) {
      console.error('[Login] Passkey not found for string ID');
      return NextResponse.json({ error: 'Biometric key not recognized.' }, { status: 404 });
    }

    // 4. Verify profile link
    const { data: profile } = await db
      .from('profiles')
      .select('id, username, wallet_address')
      .eq('id', passkey.user_id)
      .single();

    if (!profile || profile.username !== cleanUsername) {
      return NextResponse.json({ error: 'Username does not match registered key' }, { status: 401 });
    }

    // 5. Verify WebAuthn authentication
    let verification;
    try {
      let pubKeyString = passkey.public_key;
      // Handle legacy BYTEA fallback if needed
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
          id: authenticationResponse.id,
          publicKey: publicKeyBytes as any,
          counter: Number(passkey.counter),
        },
        requireUserVerification: false,
      });
    } catch (vErr: any) {
      console.error('[Login] WebAuthn verify failed:', vErr.message);
      return NextResponse.json({ 
        error: 'Biometric verification failed', 
        debug_hint: `Handshake Error: ${vErr.message}` 
      }, { status: 400 });
    }

    // 6. ONE-TIME USE: Consume challenge immediately
    await db.from('challenges').delete().eq('id', challengeData.id);

    if (verification.verified && verification.authenticationInfo) {
      const { newCounter } = verification.authenticationInfo;

      // Anti-Replay Protection
      if (newCounter > 0 && newCounter <= Number(passkey.counter)) {
        console.error('[Login] SECURITY ALERT: Counter regression!');
        return NextResponse.json({ error: 'Security violation: Probable cloned authenticator.' }, { status: 403 });
      }

      // Update counter & last used
      await db
        .from('passkeys')
        .update({ counter: newCounter, last_used_at: new Date().toISOString() })
        .eq('id', passkey.id);

      // Create session via Magic Link
      const email = `${cleanUsername}@biovault.local`;
      const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${origin}/dashboard` }
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
    console.error('CRITICAL: Login failure:', err.message);
    return NextResponse.json({ 
      error: 'Unable to verify biometric login', 
      debug_hint: `Stack: ${err.name} - ${err.message}` 
    }, { status: 500 });
  }
}
