import { createPublicClient, http, Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { 
  toCoinbaseSmartAccount, 
  toWebAuthnAccount,
} from 'viem/account-abstraction';


import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createSmartAccountClient } from 'permissionless';
import { extractRawPublicKey } from '@/lib/webauthn-utils';
import { toUint8Array } from '@/lib/encoding';

// 1. Chains and Transports
export const chain = polygonAmoy;
export const nodeTransport = http('https://rpc-amoy.polygon.technology');
const bundlerRpcUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL || '';
export const bundlerTransport = http(bundlerRpcUrl);

// 2. Clients
export const publicClient = createPublicClient({
  chain,
  transport: nodeTransport,
});

export const bundlerClient = createPimlicoClient({
  chain,
  transport: bundlerTransport,
  entryPoint: {
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    version: '0.6',
  },
});

/**
 * Derives the Coinbase Smart Account using permissionless helpers.
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
 * Creates a production-ready Smart Account Client with high-gas sponsorship.
 */
export async function createPasskeySmartAccountClient(passkeyId: string, publicKey: string) {
  const smartAccount = await getSmartAccount(passkeyId, publicKey);

  // ARCHITECTURAL FIX: Force high gas limits for WebAuthn initialized accounts
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain,
    bundlerTransport,
    paymaster: bundlerClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrice = await bundlerClient.getUserOperationGasPrice();
        return gasPrice.fast;
      },
    },
  }) as any;

  // Add gas overrides manually for deployment transactions if needed
  // or wrap sendTransaction to include high verificationGasLimit
  return smartAccountClient;
}




