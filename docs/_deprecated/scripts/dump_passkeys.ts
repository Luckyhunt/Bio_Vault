import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dumpPasskeys() {
  const { data: passkeys, error } = await supabase
    .from('passkeys')
    .select('*');

  if (error) {
    fs.writeFileSync('db_dump_error.txt', error.message);
    return;
  }

  const dump = (passkeys || []).map(pk => ({
    id: pk.id,
    user_id: pk.user_id,
    public_key: pk.public_key,
    public_key_len: pk.public_key.length,
    created_at: pk.created_at
  }));

  fs.writeFileSync('db_dump.json', JSON.stringify(dump, null, 2));
  console.log(`Dumped ${dump.length} passkeys to db_dump.json`);
}

dumpPasskeys();
