import { createPublicClient, http, Hash, Hex } from 'viem';
import { mainnet, polygonAmoy } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';

// For this MVP, we use Polygon Amoy (Testnet)
export const chain = polygonAmoy;

// Using Pimlico as our Bundler (Free tier)
export const transport = http(process.env.NEXT_PUBLIC_BUNDLER_RPC_URL);

export const publicClient = createPublicClient({
  chain,
  transport: http(),
});

export const bundlerClient = createPimlicoClient({
  chain,
  transport,
  entryPoint: {
    address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as `0x${string}`,
    version: "0.6" as const,
  },
});

/**
 * Derives the Smart Account address from a user's Public Key.
 * In a production BioVault, this would use a specialized factory 
 * that validates secp256r1 signatures.
 */
export async function getSmartAccountAddress(publicKeyHex: string): Promise<`0x${string}`> {
  // Simplified derivation for the MVP:
  // We'll treat the hash of the public key as the owner address for a standard SimpleAccount
  // In Phase 7/8, we wrap this into a full ERC-4337 UserOperation.
  const ownerAddress = `0x${publicKeyHex.slice(0, 40)}` as `0x${string}`;
  return ownerAddress; // Placeholder for actual AA factory integration
}

/**
 * Sign a transaction hash using the WebAuthn Passkey (handled on frontend)
 * This utility prepares the hash for the browser's credentials.get()
 */
export function prepareTransactionHash(hash: Hash): ArrayBuffer {
  return new Uint8Array(Buffer.from(hash.slice(2), 'hex')).buffer;
}
