import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before importing smart-wallet
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getSmartAccount } from '../src/lib/smart-wallet';
import { isHex, toHex, Hex } from 'viem';

const oldData = [
  {
    "id": "kXAkRu4fcF4aSkD2sA2lVA",
    "public_key": "a501020326200121582035e4561760b2c37e2cf76d134a43bfba30cd39fd4a1411751179a3c18599b607225820ec6d89db5bda0af0b495374d7ef246748c577e137707a4a5ca37c88e1d55ad61",
  },
  {
    "id": "qTUvcYcU0h0VFkJG221fKA",
    "public_key": "a5010203262001215820fc174a58e940acf7e7faffde3b4f7290d208e60d931a7fcee7eafbdb6be1711a225820c420b14fa2d63f383c8dfa28956f3e30a0a9d3bd663bd34acedf61531612b445",
  }
];

async function verifyFixes() {
  console.log('--- VERIFYING SMART WALLET FIXES ---');
  
  for (const entry of oldData) {
    console.log(`\nTesting Credential ID: ${entry.id}`);
    console.log(`Original Public Key: ${entry.public_key.slice(0, 20)}...`);
    
    try {
      const account = await getSmartAccount(entry.id, entry.public_key);
      console.log(`✅ Success! Derived Address: ${account.address}`);
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }
}

verifyFixes();
