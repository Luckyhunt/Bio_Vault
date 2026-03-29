import { createPublicClient, http, Hex, toHex, isHex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import {
  toCoinbaseSmartAccount,
  toWebAuthnAccount,
} from 'viem/account-abstraction';

import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createSmartAccountClient } from 'permissionless';
import { toUint8Array } from '@/lib/encoding';

// ==============================
// 1. CONFIG
// ==============================

export const chain = polygonAmoy;

export const publicClient = createPublicClient({
  chain,
  transport: http('https://rpc-amoy.polygon.technology'),
});

const bundlerRpcUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL!;

export const bundlerClient = createPimlicoClient({
  chain,
  transport: http(bundlerRpcUrl),
  entryPoint: {
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    version: '0.6',
  },
});

// ==============================
// 2. SMART ACCOUNT CREATION
// ==============================

export async function getSmartAccount(
  credentialId: string,
  publicKey: string
) {
  // Normalize inputs robustly (Handles PKCS Hex Standard)
  const idHex = isHex(credentialId) ? credentialId : toHex(toUint8Array(credentialId));
  const pubKeyHex = isHex(publicKey) ? publicKey : toHex(toUint8Array(publicKey));

  console.log('[SmartWallet] Identity Sync:', {
    id: idHex,
    pubKey: pubKeyHex,
    length: pubKeyHex.length
  });

  // ✅ Correct WebAuthn account (Direct PKCS Hex Mapping)
  const webAuthnAccount = toWebAuthnAccount({
    credential: {
      id: idHex,
      publicKey: pubKeyHex,
    },
  });



  // ✅ Coinbase Smart Account (Restored Versioning)
  const account = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [webAuthnAccount],
    version: '1',
  });



  return account;
}

// ==============================
// 3. SMART ACCOUNT CLIENT
// ==============================

export async function createPasskeySmartAccountClient(
  credentialId: string,
  publicKey: string
) {
  const account = await getSmartAccount(credentialId, publicKey);

  // 🔥 Check if already deployed
  const code = await publicClient.getCode({
    address: account.address,
  });

  const isDeployed = code && code !== '0x';

  const client = createSmartAccountClient({
    account,
    chain,
    bundlerTransport: http(bundlerRpcUrl),
    paymaster: bundlerClient,

    userOperation: {
      // ✅ Proper gas config
      estimateFeesPerGas: async () => {
        const gas = await bundlerClient.getUserOperationGasPrice();
        return gas.fast;
      },
    },
  }) as any;

  return {
    client,
    account,
    isDeployed,
  };
}





