import { createPublicClient, http, Hash, Hex } from 'viem';
import { mainnet, polygonAmoy } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { toCoinbaseSmartAccount, toWebAuthnAccount } from 'viem/account-abstraction';

// For this MVP, we use Polygon Amoy (Testnet)
export const chain = polygonAmoy;

// Using Pimlico as our Bundler and Paymaster (Free tier)
export const transport = http(process.env.NEXT_PUBLIC_BUNDLER_RPC_URL);

export const publicClient = createPublicClient({
  chain,
  transport,
});

export const bundlerClient = createPimlicoClient({
  chain,
  transport,
  entryPoint: {
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6
    version: '0.6',
  },
});

/**
 * Derives and instantiates a fully Paymaster-enabled Coinbase Smart Account powered by a WebAuthn (Passkey) Signer.
 * 
 * @param passkeyId The exact Base64URL string ID of the passkey
 * @param publicKeyHex The hex-encoded public key bytes
 */
export async function createPasskeySmartAccountClient(passkeyId: string, publicKeyHex: Hex) {
  // 1. Create the WebAuthn Signer natively with viem
  const webAuthnAccount = toWebAuthnAccount({
    credential: {
      id: passkeyId,
      publicKey: publicKeyHex,
    },
  });

  // 2. Wrap the Signer into an ERC-4337 Coinbase Smart Account Configuration
  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [webAuthnAccount],
    version: '1' as any,
  });

  // 3. Create the Smart Account Client with Pimlico Paymaster sponsorship
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain,
    bundlerTransport: transport,
    paymaster: bundlerClient, // Free Tier Pimlico Paymaster
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await bundlerClient.getUserOperationGasPrice()).fast;
      },
    },
  });

  return smartAccountClient;
}
