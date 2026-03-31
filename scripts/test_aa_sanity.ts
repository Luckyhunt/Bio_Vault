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

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;

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
  console.log("🚀 Starting BioVault AA Sanity Check...");

  // Mock WebAuthn Identity (from user's previous log mZQou4_i91dnnXqxZ3oDRQ)
  // Converting the base64url ID to hex for the simulation
  const mockCredentialId = "0x999428bb8fe2f757679d7ab1677a0345";
  // Standard P256 Public Key (Uncompressed PKCS format sample)
  const mockPublicKey = "0x047fb5a7e1c87641bc3c0f4f9f7d2f9b87f65432109876543210987654321098765432109876543210987654321098765432109876543210987654321098765432";

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

  console.log(`✅ Smart Account Address: ${account.address}`);

  console.log("2. Checking Balance...");
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`✅ Balance: ${formatEther(balance)} MATIC`);

  console.log("3. Constructing Smart Account Client (with Pimlico Paymaster)...");

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
  });

  console.log("4. Sending Test Sponsored Transaction (0.00 MATIC self-transfer)...");

  try {
    const hash = await smartAccountClient.sendTransaction({
      to: account.address,
      value: BigInt(0),
      data: '0x',
    });

    console.log(`✅ Transaction Sent! Hash: ${hash}`);
    console.log(`🔗 View on Explorer: https://amoy.polygonscan.com/tx/${hash}`);
    console.log(`🔗 View UserOp on JiffyScan: https://jiffyscan.xyz/userOpHash/${hash}?network=polygon-amoy`);
  } catch (err: any) {
    console.error("❌ Transaction Failed!");
    if (err.message.includes('AA13')) {
      console.error("DEBUG HINT: AA13 initCode failed. This usually means the Paymaster didn't sponsor the deployment.");
    } else {
      console.error(`Error Detail: ${err.message}`);
    }
  }
}

runSanityCheck().catch(console.error);
