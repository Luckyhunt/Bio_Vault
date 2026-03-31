import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpID, origin } from '@/lib/webauthn';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPKCSFromCOSE } from '@/lib/webauthn-utils';
import { toBase64URL } from '@/lib/encoding';

export async function POST(request: Request) {
  try {
    const { userId, response } = await request.json();

    if (!userId || !response?.id) {
      return NextResponse.json({ error: 'User ID and WebAuthn response required.' }, { status: 400 });
    }

    // 1. Fetch latest active challenge (Note: in prod, use challenge map / specific ID)
    const { data: challenges, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (challengeError || !challenges || challenges.length === 0) {
      return NextResponse.json({ error: 'No active session challenge found or expired' }, { status: 400 });
    }

    const currentChallenge = challenges[0];

    // 2. Strict Origin Normalization (Trailing Slash Safety)
    const normalizedExpectedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: currentChallenge.challenge,
        expectedOrigin: normalizedExpectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
    } catch (verifError: any) {
      console.error('[Add Key / Verify] Engine Rejection:', verifError.message);
      return NextResponse.json({ 
        error: 'Hardware Signature Verification Failed',
        debug_hint: verifError.message, 
        expected_origin: normalizedExpectedOrigin,
      }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'Hardware key rejection or failed attestation' }, { status: 400 });
    }

    // 3. Extract and Formatting Key Materials
    const { 
      id: credentialID, 
      publicKey: credentialPublicKey, 
      counter, 
      transports 
    } = registrationInfo.credential;

    const credentialDeviceType = registrationInfo.credentialDeviceType;
    const credentialBackedUp = registrationInfo.credentialBackedUp;
    // credentialID is already a Base64URL string in v10+
    const credentialIdBase64Url = credentialID;
    // Convert COSE Public Key to Hex for Storage
    const cosePublicKeyHex = `0x${Buffer.from(credentialPublicKey).toString('hex')}`;

    // Verify it parses correctly into PKCS to prevent AA13 down the line
    try {
      getPKCSFromCOSE(cosePublicKeyHex);
    } catch (parseErr: any) {
      console.error('[Add Key / Verify] Failed PKCS Validation', parseErr);
      return NextResponse.json({ error: 'Invalid key coordinates from device.' }, { status: 400 });
    }

    // 4. Save Key to Database (Linking to existing user profile)
    const { error: insertError } = await supabaseAdmin
      .from('passkeys')
      .insert({
        id: credentialIdBase64Url,
        user_id: userId,
        public_key: cosePublicKeyHex,
        counter,
        transports: response.response.transports || [],
        credential_device_type: credentialDeviceType,
        credential_backed_up: credentialBackedUp,
      });

    if (insertError) {
      console.error('[Add Key / Storage] Insert Failed:', insertError.message);
      // Suppress UI-level duplicates (if UUID/id collides)
      return NextResponse.json({ error: 'This device is already enrolled or failed to save.' }, { status: 500 });
    }

    // 5. Cleanup the challenge to prevent replay
    await supabaseAdmin
      .from('challenges')
      .delete()
      .eq('id', currentChallenge.id);

    return NextResponse.json({ success: true, verified: true });

  } catch (globalError: any) {
    console.error('[Add Key / Catch] Global Error:', globalError.message);
    return NextResponse.json({ 
      error: 'Device Enrollment Failed',
      debug_hint: globalError.message 
    }, { status: 500 });
  }
}
