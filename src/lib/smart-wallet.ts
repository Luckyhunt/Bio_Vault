import { createPublicClient, http, Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { 
  toCoinbaseSmartAccount 
} from 'viem/account-abstraction';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createSmartAccountClient } from 'permissionless';
import { extractRawPublicKey } from '@/lib/webauthn-utils';
import { toUint8Array } from '@/lib/encoding';
import { fromHex } from 'viem';

// 1. Separate Transports for Node Reads vs Bundler Writes
export const chain = polygonAmoy;
export const nodeTransport = http('https://rpc-amoy.polygon.technology');
const bundlerRpcUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL || '';
export const bundlerTransport = http(bundlerRpcUrl);

// 2. Public Client for eth_call, balance, and contract reads
export const publicClient = createPublicClient({
  chain,
  transport: nodeTransport,
});

// 3. Bundler Client for UserOperations and Paymaster
export const bundlerClient = createPimlicoClient({
  chain,
  transport: bundlerTransport,
  entryPoint: {
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6
    version: '0.6',
  },
});

/**
 * Deterministically derives the Coinbase Smart Account configuration.
 * This can be used on both the Client and Server for address consistency.
 */
export async function getSmartAccount(passkeyId: string, publicKey: string) {
  const cleanId = passkeyId.startsWith('\\x') ? `0x${passkeyId.slice(2)}` as Hex : passkeyId;
  const cleanPublicKey = publicKey.startsWith('\\x') ? `0x${publicKey.slice(2)}` : publicKey;

  const rawPublicKey = cleanPublicKey.startsWith('0x') 
    ? cleanPublicKey as Hex 
    : extractRawPublicKey(toUint8Array(cleanPublicKey)) as Hex;

  const webAuthnAccount = toWebAuthnAccount({
    credential: {
      id: cleanId,
      publicKey: rawPublicKey,
    },
  });

  return await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [webAuthnAccount],
    version: '1',
  });
}

/**
 * Instantiates a fully functional Smart Account Client with Paymaster support.
 */
export async function createPasskeySmartAccountClient(passkeyId: string, publicKey: string) {
  const smartAccount = await getSmartAccount(passkeyId, publicKey);

  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain,
    bundlerTransport,
    paymaster: bundlerClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await bundlerClient.getUserOperationGasPrice()).fast;
      },
    },
  }) as any;

  return smartAccountClient;
}


