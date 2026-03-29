import { createPublicClient, http, Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { 
  toCoinbaseSmartAccount 
} from 'viem/account-abstraction';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createSmartAccountClient } from 'permissionless';

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
 * Derives and instantiates a fully Paymaster-enabled Coinbase Smart Account 
 * powered by a WebAuthn (Passkey) Signer.
 * 
 * @param passkeyId The exact Base64URL string ID of the passkey
 * @param publicKeyHex The raw 64-byte hex-encoded public key coordinates
 */
export async function createPasskeySmartAccountClient(passkeyId: string, publicKeyHex: Hex) {
  // Normalize IDs from Supabase/Postgres BYTEA prefixes (\x -> 0x)
  const cleanId = passkeyId.startsWith('\\x') ? `0x${passkeyId.slice(2)}` as Hex : passkeyId;
  const cleanPublicKey = publicKeyHex.startsWith('\\x') ? `0x${publicKeyHex.slice(2)}` as Hex : publicKeyHex;

  // 1. Create the WebAuthn Signer natively with viem
  const webAuthnAccount = toWebAuthnAccount({
    credential: {
      id: cleanId,
      publicKey: cleanPublicKey,
    },
  });

  // 2. Wrap the Signer into an ERC-4337 Coinbase Smart Account Configuration
  // This derives the Smart Account address using the public key owners.
  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [webAuthnAccount],
    version: '1', // Corrected version for Coinbase Smart Account
  });

  // 3. Create the Smart Account Client with Pimlico Paymaster sponsorship
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain,
    bundlerTransport,
    paymaster: bundlerClient, // Free Tier Pimlico Paymaster
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await bundlerClient.getUserOperationGasPrice()).fast;
      },
    },
  }) as any;

  return smartAccountClient;
}

