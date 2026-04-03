import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createSmartAccountClient } from 'permissionless';
import { toCoinbaseSmartAccount, toWebAuthnAccount } from 'viem/account-abstraction';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * SANITY CHECK SCRIPT: BIOVAULT AA FLOW
 * This script simulates the backend/frontend logic for:
 * 1. Deriving a smart account from a mock WebAuthn key.
 * 2. Checking balance.
 * 3. Sending a sponsored 0.00 MATIC transaction via Pimlico.
 */

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL!;

if (!BUNDLER_URL) {
  throw new Error("Missing NEXT_PUBLIC_BUNDLER_RPC_URL in .env");
}

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

const pimlicoClient = createPimlicoClient({
  chain: polygonAmoy,
  transport: http(BUNDLER_URL),
  entryPoint: {
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    version: '0.6',
  },
});

async function runSanityCheck() {
  console.log("🚀 Starting BioVault Deep AA Sanity Check...");

  // Mock WebAuthn Identity
  const mockCredentialId = "0x999428bb8fe2f757679d7ab1677a0345";
  const mockPubX = "0".repeat(64);
  const mockPubY = "0".repeat(64);
  const mockPublicKey = `0x04${mockPubX}${mockPubY}`;

  console.log("1. Deriving Smart Account Address...");

  const webAuthnAccount = toWebAuthnAccount({
    credential: {
      id: mockCredentialId,
      publicKey: mockPublicKey as `0x${string}`,
    },
  });

  const account = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [webAuthnAccount],
    version: '1',
  });

  console.log(`✅ Derived Address: ${account.address}`);

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: polygonAmoy,
    bundlerTransport: http(BUNDLER_URL),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const gas = await pimlicoClient.getUserOperationGasPrice();
        return gas.fast;
      },
    },
  }) as any;

  console.log("2. Simulating Paymaster & Gas Tuning...");
  
  try {
    const userOp = await smartAccountClient.prepareUserOperation({
      calls: [{ to: account.address, value: BigInt(0), data: '0x' }],
    });

    console.log("✅ Paymaster Simulation Successful!");
    
    // Gas assertions
    const vGas = BigInt(userOp.verificationGasLimit as any);
    if (vGas < 1000000n) {
      console.warn(`⚠️ Warning: verificationGasLimit (${vGas}) seems too low for deployment.`);
    } else {
      console.log(`✅ verificationGasLimit is healthy: ${vGas}`);
    }

  } catch (err: any) {
    console.error("❌ Paymaster Simulation Failed!");
    if (err.message.includes('out of funds')) {
      console.error("DEBUG: Paymaster out of funds.");
    } else if (err.message.includes('policy')) {
      console.error("DEBUG: Sponsorship policy rejects this UserOp (likely initCode deployment).");
    }
    console.error(err.message);
  }

  console.log("🏁 Sanity Check Complete.");
}


runSanityCheck().catch(console.error);
