import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { toBase64URL, toUint8Array } from '@/lib/encoding';

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Vault initialization failed', debug_hint: 'Missing ENV' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, challenge, attestationResponse } = body;

    if (!username || !challenge || !attestationResponse) {
      return NextResponse.json({ error: 'Missing required registration data' }, { status: 400 });
    }

    // 1. Fetch and consume one-time challenge from DB
    const { data: challengeData, error: challengeFetchError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('type', 'registration')
      .single();

    if (challengeFetchError || !challengeData) {
      console.warn('[Register] Invalid or missing challenge');
      return NextResponse.json({ error: 'Handshake invalid. Please try again.' }, { status: 400 });
    }

    // Security: Challenge must not be expired
    if (new Date(challengeData.expires_at) < new Date()) {
      await supabaseAdmin.from('challenges').delete().eq('id', challengeData.id);
      return NextResponse.json({ error: 'Handshake expired. Please refresh.' }, { status: 400 });
    }

    // 2. Verify WebAuthn attestation
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (vError: any) {
      console.error('WebAuthn Library Error:', vError);
      return NextResponse.json({ 
        error: 'Biometric registration failed', 
        debug_hint: process.env.NODE_ENV === 'development' ? vError.message : undefined 
      }, { status: 400 });
    }

    // 3. ONE-TIME USE: Consume challenge immediately
    await supabaseAdmin.from('challenges').delete().eq('id', challengeData.id);

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${cleanUsername}@biovault.local`;

      // 4. Encode & Store Public Key (WEB-AUTHN MANIFESTO VACCINE)
      const walletAddress = `0x${Buffer.from(credentialPublicKey).slice(-20).toString('hex')}` as `0x${string}`;

      // MANIFESTO DIAGNOSTICS: Logging sizes for Vercel console
      console.log('--- REGISTER DIAGNOSIS ---');
      console.log('User:', cleanUsername);
      console.log('Credential ID length:', credentialID.length);
      console.log('Raw PK length:', credentialPublicKey.length);
      console.log('Wallet address:', walletAddress);
      console.log('--- END DIAGNOSIS ---');

      // Check for orphan or fresh user
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
      const orphanUser = existingAuthUsers?.users?.find(u => u.email === email);

      let userId: string;

      if (orphanUser) {
        await supabaseAdmin.auth.admin.updateUserById(orphanUser.id, {
          user_metadata: { username: cleanUsername, wallet_address: walletAddress },
        });
        userId = orphanUser.id;
      } else {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: Math.random().toString(36).slice(-16),
          user_metadata: { username: cleanUsername, wallet_address: walletAddress },
          email_confirm: true,
        });

        if (authError) throw new Error(`Auth Engine Error: ${authError.message}`);
        userId = authUser.user.id;
      }

      // 5. Store Passkey (BEYOND STABLE: CHARACTER-PERFECT DIRECT STRING)
      const { error: dbError } = await supabaseAdmin
        .from('passkeys')
        .insert({
          id: attestationResponse.id, // Direct string from browser
          user_id: userId,
          public_key: toBase64URL(toUint8Array(credentialPublicKey)), // Standard string
          counter,
          credential_device_type: verification.registrationInfo.credentialDeviceType || 'singleDevice',
          credential_backed_up: verification.registrationInfo.credentialBackedUp || false,
          transports: attestationResponse.response.transports || [],
        });

      if (dbError) {
        console.error('Passkey DB Insertion Failure:', dbError);
        throw new Error(`Vault Storage Error: ${dbError.message}`);
      }

      // 6. Ensure Profiles record exists
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          username: cleanUsername,
          display_name: username,
          wallet_address: walletAddress,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn('[Register] Profile sync failed:', profileError.message);
      }

      return NextResponse.json({ verified: true, walletAddress });
    }
  } catch (err: any) {
    console.error('CRITICAL: Registration verify failure:', err);
    return NextResponse.json({ 
      error: 'Unable to verify biometric registration', 
      debug_hint: process.env.NODE_ENV === 'development' ? err.message : undefined 
    }, { status: 500 });
  }
}
