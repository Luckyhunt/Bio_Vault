import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, authenticationResponse } = body;

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('authentication_challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });
    }

    // 1. Find the passkey in our DB
    const { data: passkey, error: pkError } = await supabaseAdmin
      .from('passkeys')
      .select('*, profiles!inner(id, username)')
      .eq('id', authenticationResponse.id)
      .eq('profiles.username', username)
      .single();

    if (pkError || !passkey) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // 2. Verify authentication
    const verification = await verifyAuthenticationResponse({
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

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;

      // 3. Update counter in DB
      await supabaseAdmin
        .from('passkeys')
        .update({ counter: newCounter })
        .eq('id', passkey.id);

      // 4. Create Supabase Auth session for the user
      // Since we don't have their password here, we sign them in using the admin API to get a session
      // or we can generate a short-lived link. 
      // Simplified: We'll sign them in by creating a session via the admin API and setting the cookie.
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: `${username}@biovault.local`,
      });

      if (sessionError) throw sessionError;

      // Clean up challenge
      cookieStore.delete('authentication_challenge');

      return NextResponse.json({ 
        verified: true,
        redirectUrl: sessionData.properties.action_link // The magic link will auto-sign them in
      });
    } else {
      return NextResponse.json({ verified: false }, { status: 400 });
    }
  } catch (error) {
    console.error('Authentication verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
