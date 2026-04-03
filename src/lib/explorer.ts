import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';
import { chain } from '@/lib/smart-wallet';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  methodName?: string;
}

/**
 * BioVault Transaction Explorer Utility (Etherscan V2 Unified)
 * Automatically detects environment: 
 * - Client: Calls internal secure API proxy (/api/history)
 * - Server: Direct call to Etherscan using private ETHERSCAN_API_KEY
 */
export async function getTransactionHistory(address: string): Promise<Transaction[]> {
  // --- 1. CLIENT-SIDE BRANCH ---
  // Calls the local Next.js API route to keep the Etherscan key hidden.
  if (typeof window !== 'undefined') {
    try {
      const resp = await fetch(`/api/history?address=${address}`);
      if (!resp.ok) {
        console.error('[Explorer] Proxy returned error status:', resp.status);
        return [];
      }
      return await resp.json();
    } catch (err) {
      console.warn('[Explorer] Client-side fetch failed, proxy might be unreachable:', err);
      return [];
    }
  }

  // --- 2. SERVER-SIDE BRANCH ---
  // Direct execution with the private SERVER_CONFIG.etherscanApiKey
  if (!SERVER_CONFIG.etherscanApiKey) {
    console.warn("[Explorer] SERVER_CONFIG.etherscanApiKey is missing.");
    return [];
  }

  // Construct Etherscan V2 Unified API URL
  const url = `${PUBLIC_CONFIG.explorerApiUrl}?chainid=${chain.id}&module=account&action=txlist&address=${address}&page=1&offset=10&sort=desc&apikey=${SERVER_CONFIG.etherscanApiKey}`;

  try {
    const resp = await fetch(url, {
      next: { revalidate: 60 }, // ISR caching for performance
    });
    
    const data = await resp.json();
    
    // Etherscan Status Logic: "1" = Success, "0" = No txs or Error
    if (data.status !== '1') {
      return [];
    }

    return Array.isArray(data.result) ? data.result : [];
  } catch (error) {
    console.error('[Explorer] Server-side fetch failed:', error);
    return [];
  }
}
