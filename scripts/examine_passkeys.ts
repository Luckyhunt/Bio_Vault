import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function examinePasskeys() {
  const { data: passkeys, error } = await supabase
    .from('passkeys')
    .select('*');

  if (error) {
    console.error('Error fetching passkeys:', error.message);
    return;
  }

  if (!passkeys || passkeys.length === 0) {
    console.log('No passkeys found in the "passkeys" table.');
    return;
  }

  console.log('--- FOUND PASSKEYS ---');
  passkeys.forEach((pk, index) => {
    console.log(`[#${index + 1}] ID: ${pk.id}`);
    console.log(`     User ID: ${pk.user_id}`);
    console.log(`     Public Key: ${pk.public_key.slice(0, 20)}... (Length: ${pk.public_key.length})`);
    console.log(`     Created At: ${pk.created_at}`);
    
    // Check if it looks like COSE or PKCS
    const isHex = pk.public_key.startsWith('0x');
    const length = isHex ? (pk.public_key.length - 2) / 2 : pk.public_key.length / 2;
    
    if (pk.public_key.length > 132) {
        console.log('     Format: Likely COSE (Encoded)');
    } else {
        console.log('     Format: Likely PKCS (Raw)');
    }
    console.log('------------------------');
  });
}

examinePasskeys();
