import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, authenticationResponse } = body;

    if (!username || !authenticationResponse) {
      return NextResponse.json({ error: 'Missing required login data' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('authentication_challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Session expired. Please try again.' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Find the passkey directly by credential ID
    const { data: passkey, error: pkError } = await supabaseAdmin
      .from('passkeys')
      .select('id, public_key, counter, user_id')
      .eq('id', authenticationResponse.id)
      .single();

    if (pkError || !passkey) {
      console.warn('Passkey not found for credential ID:', authenticationResponse.id);
      return NextResponse.json({ error: 'Biometric key not recognized' }, { status: 404 });
    }

    // 2. Verify the username matches this passkey's owner
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', passkey.user_id)
      .single();

    if (!profile || profile.username !== cleanUsername) {
      return NextResponse.json({ error: 'Username does not match registered key' }, { status: 401 });
    }

    // 3. Verify the WebAuthn authentication response
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: Buffer.from(passkey.public_key, 'hex'),
          counter: Number(passkey.counter),
        },
        requireUserVerification: true,
      });
    } catch (vErr: any) {
      console.error('WebAuthn auth verification error:', vErr);
      return NextResponse.json({ error: 'Biometric verification failed', debug_hint: vErr.message }, { status: 400 });
    }

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;

      // 4. Update replay-attack counter
      await supabaseAdmin
        .from('passkeys')
        .update({ counter: newCounter, last_used_at: new Date().toISOString() })
        .eq('id', passkey.id);

      // 5. Sign the user in by generating a short-lived OTP link and returning the token
      // We use the stored email format from registration
      const email = `${cleanUsername}@biovault.local`;
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (linkError) {
        console.error('Failed to generate session link:', linkError);
        throw new Error(linkError.message);
      }

      cookieStore.delete('authentication_challenge');

      // Return the magic link URL — the client will redirect to it which signs them in.
      return NextResponse.json({ 
        verified: true,
        redirectUrl: linkData.properties.action_link
      });
    } else {
      return NextResponse.json({ verified: false, error: 'Biometric check failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('CRITICAL: Login verification failure:', error);
    return NextResponse.json({ 
      error: 'Login failed. Please try again.',
      debug_hint: error.message
    }, { status: 500 });
  }
}
