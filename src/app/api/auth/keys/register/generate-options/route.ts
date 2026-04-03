import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { rpName, rpID } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';

import { RegistrationGenerateSchema } from '@/lib/schemas';
import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = RegistrationGenerateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { userId } = result.data;

    // 1. Fetch user from profiles to get the username
    const db = createClient(PUBLIC_CONFIG.supabaseUrl, SERVER_CONFIG.supabaseServiceKey);
    const { data: profile } = await db
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // 2. Fetch all existing passkeys for this user to exclude them
    const { data: existingKeys } = await db
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
    const { error: challengeError } = await db
      .from('challenges')
      .insert({
        challenge: options.challenge,
        type: 'registration',
        user_id: userId, // ✅ SECURITY: Bind challenge to unique user session
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
