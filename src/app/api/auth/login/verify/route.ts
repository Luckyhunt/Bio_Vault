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
      return NextResponse.json({ error: 'Session expired. Please refresh and try again.' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Find the passkey directly by credential ID
    const { data: passkey, error: pkError } = await supabaseAdmin
      .from('passkeys')
      .select('id, public_key, counter, user_id')
      .eq('id', authenticationResponse.id)
      .single();

    if (pkError || !passkey) {
      console.warn('[Login] Passkey not found. Credential ID:', authenticationResponse.id);
      return NextResponse.json({ 
        error: 'Biometric key not recognized. Did you register on this device?',
        debug_hint: `No passkey found for id: ${authenticationResponse.id}`
      }, { status: 404 });
    }

    // 2. Verify username ownership
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', passkey.user_id)
      .single();

    if (!profile || profile.username !== cleanUsername) {
      return NextResponse.json({ 
        error: 'Username does not match registered key',
        debug_hint: `Profile username: ${profile?.username}, attempted: ${cleanUsername}`
      }, { status: 401 });
    }

    // 3. Verify WebAuthn authentication
    let verification;
    try {
      // PRO-GRADE DECODER: Explicitly handles Base64 keys
      const publicKeyBytes = new Uint8Array(Buffer.from(passkey.public_key, 'base64'));
      console.log(`[Login] Authenticating ${cleanUsername} | Key Length: ${publicKeyBytes.length}`);

      if (!publicKeyBytes || publicKeyBytes.length === 0) {
        return NextResponse.json({
          error: 'Vault key data is corrupted',
          debug_hint: `Zero length key for id: ${passkey.id}`
        }, { status: 400 });
      }

      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: publicKeyBytes,
          counter: Number(passkey.counter),
        },
        requireUserVerification: false,
      });
    } catch (vErr: any) {
      console.error('[Login] WebAuthn verify failed:', {
        message: vErr.message,
        rpID,
        origin,
        credentialId: passkey.id,
        counter: passkey.counter,
      });
      return NextResponse.json({
        error: 'Biometric verification failed',
        debug_hint: vErr.message
      }, { status: 400 });
    }

    if (!verification.verified) {
      return NextResponse.json({ verified: false, error: 'Biometric check failed' }, { status: 400 });
    }

    // 4. Update replay-attack counter
    await supabaseAdmin
      .from('passkeys')
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq('id', passkey.id);

    // 5. Create a real session using admin API
    // We sign them in directly using the stored email — no magic link redirect needed
    const email = `${cleanUsername}@biovault.local`;
    
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(passkey.user_id);
    
    if (!userData?.user) {
      throw new Error('User account not found in auth system');
    }

    // Generate a session link and extract the token from it for client-side sign-in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError) {
      console.error('[Login] Failed to generate auth link:', linkError);
      throw new Error(linkError.message);
    }

    cookieStore.delete('authentication_challenge');

    // Return token directly so frontend can set session without relying on redirect
    return NextResponse.json({ 
      verified: true,
      redirectUrl: linkData.properties.action_link,
      // Also provide the email so client can use Supabase JS to handle session
      userEmail: email,
    });

  } catch (error: any) {
    console.error('[Login] CRITICAL failure:', error.message);
    return NextResponse.json({ 
      error: 'Login failed. Please try again.',
      debug_hint: error.message
    }, { status: 500 });
  }
}
