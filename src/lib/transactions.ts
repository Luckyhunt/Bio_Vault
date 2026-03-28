import { 
  encodeFunctionData, 
  Address, 
  parseEther, 
  Hex, 
  keccak256, 
  toHex 
} from 'viem';
import { 
  createSmartAccountClient, 
} from 'permissionless';

const ENTRYPOINT_ADDRESS_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";


/**
 * Encodes the UserOperation hash for WebAuthn signing.
 * This ensures the signature is compatible with on-chain verification.
 */
export function getBioSignPayload(userOpHash: Hex): Hex {
  // In a real passkey-validated AA, we sign the userOpHash directly or wrapped.
  return userOpHash;
}

/**
 * Mocks the process of sending a sponsored transaction. 
 * In a full production BioVault, this would use permissionless.js
 * specifically configured with a WebAuthn-compatible Smart Account.
 */
export async function sendSponsoredTransaction(
  target: Address, 
  value: string, 
  data: Hex = '0x'
) {
  // 1. Prepare the call data
  const amount = parseEther(value);
  
  // 2. This is where we would call the Bundler to get gas estimates
  // and construct the UserOperation.
  
  console.log(`Preparing biometric transaction to ${target} for ${value} ETH...`);
  
  // For the MVP demonstration, we return the intent.
  return {
    target,
    amount,
    data,
    entryPoint: ENTRYPOINT_ADDRESS_V06
  };
}
