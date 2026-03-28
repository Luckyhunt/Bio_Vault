import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { rpID } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { UsernameSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = UsernameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { username } = result.data;

    // 1. Find user and their passkeys in Supabase
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, passkeys(id)')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userPasskeys = profile.passkeys.map((pk: any) => ({
      id: pk.id,
      transports: pk.transports,
    }));

    // 2. Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map((pk: any) => ({
        id: pk.id,
        type: 'public-key',
        transports: pk.transports,
      })),
      userVerification: 'preferred',
    });

    // 3. Store challenge in cookie
    const cookieStore = await cookies();
    cookieStore.set('authentication_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 5,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Authentication options error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
