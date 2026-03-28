import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { toBase64URL } from '@/lib/encoding';

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Vault initialization failed', debug_hint: 'Missing ENV' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, attestationResponse } = body;

    if (!username || !attestationResponse) {
      return NextResponse.json({ error: 'Missing required registration data' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('registration_challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Session expired. Please refresh and try again.' }, { status: 400 });
    }

    // Verify WebAuthn attestation
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (vError: any) {
      console.error('WebAuthn Library Error:', vError);
      return NextResponse.json({ error: 'Biometric verification failed', debug_hint: vError.message }, { status: 400 });
    }

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${cleanUsername}@biovault.local`;

      // 4. Encode & Store Public Key (WEB-AUTHN MANIFESTO VACCINE)
      const publicKeyB64URL = toBase64URL(credentialPublicKey);
      const walletAddress = `0x${Buffer.from(credentialPublicKey).slice(-20).toString('hex')}` as `0x${string}`;

      // MANIFESTO DIAGNOSTICS
      console.log('--- REGISTER DIAGNOSIS ---');
      console.log('User:', cleanUsername);
      console.log('Raw PK length:', credentialPublicKey.length);
      console.log('B64URL PK length:', publicKeyB64URL.length);
      console.log('Wallet address:', walletAddress);
      console.log('--- END DIAGNOSIS ---');

      // Check if this username is truly taken (vs orphaned auth user with no passkey)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .single();

      if (existingProfile) {
        return NextResponse.json({ error: 'This vault name is already taken. Choose another.' }, { status: 400 });
      }

      // Check for orphaned auth user (created but registration failed before passkey saved)
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
      const orphanUser = existingAuthUsers?.users?.find(u => u.email === email);

      let userId: string;

      if (orphanUser) {
        // Orphan detected — reuse the existing auth user ID, update their metadata
        console.log(`Recovering orphaned auth user: ${email}`);
        await supabaseAdmin.auth.admin.updateUserById(orphanUser.id, {
          user_metadata: { username: cleanUsername, wallet_address: walletAddress },
        });
        userId = orphanUser.id;
      } else {
        // Fresh registration
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: Math.random().toString(36).slice(-16),
          user_metadata: { username: cleanUsername, wallet_address: walletAddress },
          email_confirm: true,
        });

        if (authError) {
          console.error('Supabase Auth failure:', authError);
          throw new Error(`Auth Engine Error: ${authError.message}`);
        }

        userId = authUser.user.id;
      }

      // Store Passkey
      const { error: dbError } = await supabaseAdmin
        .from('passkeys')
        .insert({
          id: credentialID,
          user_id: userId,
          public_key: publicKeyB64URL,
          counter,
          device_type: verification.registrationInfo.credentialDeviceType || 'single_device',
          transports: attestationResponse.response.transports || [],
        });

      if (dbError) {
        console.error('Passkey DB Insertion Failure:', dbError);
        throw new Error(`Vault Storage Error: ${dbError.message}`);
      }

      cookieStore.delete('registration_challenge');

      return NextResponse.json({ verified: true, walletAddress });
    } else {
      return NextResponse.json({ verified: false, error: 'Biometric verification returned false' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('CRITICAL: Registration Workflow Crash:', error);
    return NextResponse.json({ error: 'Internal Vault System Error', debug_hint: error.message }, { status: 500 });
  }
}
