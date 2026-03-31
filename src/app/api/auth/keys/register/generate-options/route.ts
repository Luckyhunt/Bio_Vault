import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { rpName, rpID } from '@/lib/webauthn';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. User ID required.' }, { status: 401 });
    }

    // 1. Fetch user from profiles to get the username
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // 2. Fetch all existing passkeys for this user to exclude them
    const { data: existingKeys } = await supabaseAdmin
      .from('passkeys')
      .select('id')
      .eq('user_id', userId);

    const excludeCredentials = (existingKeys || []).map(key => ({
      id: key.id.startsWith('\\x') ? Buffer.from(key.id.slice(2), 'hex').toString('base64url') : key.id,
      type: 'public-key' as const,
      transports: ['usb', 'ble', 'nfc', 'internal', 'hybrid'] as ('usb' | 'ble' | 'nfc' | 'internal' | 'hybrid')[],
    }));

    // 3. Generate Registration Options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(profile.username), 
      userName: profile.username,
      attestationType: 'none',
      excludeCredentials, // Prevent registering the exact same device twice
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    // 4. Store Challenge
    const { error: challengeError } = await supabaseAdmin
      .from('challenges')
      .insert({
        challenge: options.challenge,
        type: 'registration', // We use standard registration type 
        expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      });

    if (challengeError) {
      throw new Error(`Challenge storage failed: ${challengeError.message}`);
    }

    return NextResponse.json(options);

  } catch (error: any) {
    console.error('[Add Key / Generate] Error:', error.message);
    return NextResponse.json({ 
      error: 'Unable to initiate new device registration',
      debug_hint: error.message 
    }, { status: 500 });
  }
}
