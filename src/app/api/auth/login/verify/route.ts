import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';
import { hexToBytes } from 'viem';

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

    const { data: passkey } = await db
      .from('passkeys')
      .select('id, public_key, counter, user_id')
      .eq('id', authenticationResponse.id)
      .single();

    if (!passkey) {
      return NextResponse.json({ error: 'Biometric key not recognized.' }, { status: 404 });
    }

    const { data: profile } = await db
      .from('profiles')
      .select('id, username, wallet_address')
      .eq('id', passkey.user_id)
      .single();

    if (!profile || profile.username !== cleanUsername) {
      return NextResponse.json({ error: 'Username mismatch' }, { status: 401 });
    }

    let verification;

    try {
      // passkey.public_key is now the COSE Hex from the DB
      const publicKeyBytes = new Uint8Array(hexToBytes(passkey.public_key as `0x${string}`));

      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: publicKeyBytes,
          counter: Number(passkey.counter),
        },
        requireUserVerification: true,
      });
    } catch (err: any) {
      return NextResponse.json({
        error: 'Biometric verification failed',
        debug_hint: err.message,
      }, { status: 400 });
    }

    await db.from('challenges').delete().eq('id', challengeData.id);

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json({ error: 'Biometric verification returned false' }, { status: 401 });
    }

    const { newCounter } = verification.authenticationInfo;

    if (newCounter > 0 && newCounter <= Number(passkey.counter)) {
      return NextResponse.json({ error: 'Security violation detected' }, { status: 403 });
    }

    await db
      .from('passkeys')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id);

    const email = `${cleanUsername}@biovault.local`;

    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${origin}/dashboard` },
    });

    if (linkError) {
      throw new Error(linkError.message);
    }

    return NextResponse.json({
      verified: true,
      walletAddress: profile.wallet_address,
      redirectUrl: linkData.properties.action_link,
    });

  } catch (err: any) {
    return NextResponse.json({
      error: 'Unable to verify biometric login',
      debug_hint: err.message,
    }, { status: 500 });
  }
}