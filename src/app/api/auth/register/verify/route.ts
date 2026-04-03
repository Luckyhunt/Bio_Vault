import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { toBase64URL, toUint8Array } from '@/lib/encoding';
import crypto from 'crypto';
import { convertCOSEtoPKCS } from '@simplewebauthn/server/helpers';
import { getSmartAccount } from '@/lib/smart-wallet';
import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';


import { supabaseAdmin as adminClient } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const SUPABASE_URL = PUBLIC_CONFIG.supabaseUrl;
  const SUPABASE_KEY = SERVER_CONFIG.supabaseServiceKey;

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const { username, challenge, attestationResponse } = body;

    if (!username || !challenge || !attestationResponse) {
      return NextResponse.json({ error: 'Missing required registration data' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. SECURITY: Rate Limiting / Handshake Velocity Verification
    // Check if this username is spamming registration attempts
    const { count: recentAttempts } = await db
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'registration')
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 mins

    if (recentAttempts && recentAttempts > 10) {
      return NextResponse.json({ error: 'Too many registration attempts. Please wait 5 minutes.' }, { status: 429 });
    }

    // 2. Fetch and consume one-time challenge from DB
    const { data: challengeData, error: challengeFetchError } = await db
      .from('challenges')
      .select('*')
      .eq('challenge', challenge)
      .eq('type', 'registration')
      .single();

    if (challengeFetchError || !challengeData) {
      console.warn('[Register] Invalid or missing challenge');
      return NextResponse.json({ error: 'Handshake invalid. Please try again.' }, { status: 401 });
    }

    // 3. Verify WebAuthn attestation (STRICT MODE)
    let verification;
    try {
      // ✅ Normalizing origin: remove trailing slash for strict match logic
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: normalizedOrigin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (vError: any) {
      console.error('[Register] WebAuthn Lib Error:', vError.message);
      return NextResponse.json({ 
        error: 'Biometric handshake failed', 
        debug_hint: `Verification Error: ${vError.message}` 
      }, { status: 400 });
    }
    
    // 4. ONE-TIME USE: Consume challenge immediately
    await db.from('challenges').delete().eq('id', challengeData.id);

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

        // ✅ ARCHITECTURAL FIX: Extract RAW SECP256R1 Public Key (PKCS Format)
        // This is the CRITICAL STEP for Coinbase Smart Account factory
        const rawPKCS = convertCOSEtoPKCS(credentialPublicKey);

        const publicKeyHex = `0x${Buffer.from(rawPKCS).toString('hex')}`;

        console.log('[Register] Identity Map:', {
          id: attestationResponse.id,
          pkcs_key: publicKeyHex,
          length: publicKeyHex.length
        });

        const email = `${cleanUsername}@biovault.app`;

        // 5. DIAGNOSTIC BLOCK: Deterministic Smart Account Address
        let walletAddress: string;
        try {
          console.log('[Register] Deriving Smart Account Address...');
          const smartAccount = await getSmartAccount(
            attestationResponse.id, 
            publicKeyHex // Standardized Hex
          );
          walletAddress = smartAccount.address;
        } catch (derivationErr: any) {
          console.error('[Register] Identity Derivation Failed:', derivationErr.message);
          return NextResponse.json({ 
            error: 'Identity derivation failure', 
            debug_hint: `Derivation Error: ${derivationErr.message}` 
          }, { status: 500 });
        }

        // 6. DB SYNC: Auth & Profile Management
        const { data: existingAuthUsers } = await db.auth.admin.listUsers();
        const orphanUser = existingAuthUsers?.users?.find((u: any) => u.email === email);

        let userId: string;

        // 9. ✅ GLITCH-FREE SESSION INIT: Create/Update user with a secure random token
        const sessionToken = crypto.randomUUID() + crypto.randomUUID();
        
        if (orphanUser) {
          await db.auth.admin.updateUserById(orphanUser.id, {
            password: sessionToken,
            user_metadata: { username: cleanUsername, wallet_address: walletAddress },
          });
          userId = orphanUser.id;
        } else {
          const { data: authUser, error: authError } = await db.auth.admin.createUser({
            email,
            password: sessionToken,
            user_metadata: { username: cleanUsername, wallet_address: walletAddress },
            email_confirm: true,
          });

          if (authError) throw new Error(`Supabase Auth Error: ${authError.message}`);
          userId = authUser.user.id;
        }

        // 7. Passkey Persistence
        const { error: dbError } = await db
          .from('passkeys')
          .insert({
            id: attestationResponse.id, 
            user_id: userId,
            public_key: Buffer.from(credentialPublicKey).toString('hex'), // Store original COSE Hex
            counter,
            credential_device_type: verification.registrationInfo.credentialDeviceType || 'singleDevice',
            transports: attestationResponse.response.transports || [],
          });


        if (dbError) throw new Error(`Vault DB Error: ${dbError.message}`);

        // 8. Profile Update
        await db.from('profiles').upsert({
          id: userId,
          username: cleanUsername,
          display_name: username,
          wallet_address: walletAddress,
          updated_at: new Date().toISOString(),
        });

        console.log('[Register/Verify] ✅ Vault initialized for:', cleanUsername);

      return NextResponse.json({ 
        verified: true, 
        walletAddress,
        sessionConfig: { email, password: sessionToken }
      });
    }

    return NextResponse.json({ error: 'Biometric verification returned false' }, { status: 403 });

  } catch (err: any) {
    console.error('CRITICAL: Registration failure:', err.message);
    return NextResponse.json({ 
      error: 'Unable to verify biometric registration', 
      debug_hint: `Stack: ${err.name} - ${err.message}` 
    }, { status: 500 });
  }

}
