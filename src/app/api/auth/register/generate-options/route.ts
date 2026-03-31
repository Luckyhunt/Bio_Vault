import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { rpName, rpID } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';
import { UsernameSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Vault initialization failed', debug_hint: 'Missing ENV' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await request.json();
    const result = UsernameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { username } = result.data;

    // In a real app, you might check if user already exists
    // For this MVP, we'll allow generating options for any unique username

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(username), 
      userName: username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    // Store challenge in the database for session-less verification
    const { error: challengeError } = await supabaseAdmin
      .from('challenges')
      .insert({
        challenge: options.challenge,
        type: 'registration',
        expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes
      });

    if (challengeError) {
      console.error('Challenge DB sync failure:', challengeError);
      throw new Error(`Vault Handshake Error: ${challengeError.message}`);
    }

    console.log(`[Register] Challenge persisted for ${username}`);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('CRITICAL: Registration options failure:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}
