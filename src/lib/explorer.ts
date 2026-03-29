/**
 * BioVault Transaction Explorer Utility
 * Fetches real on-chain activity for the Smart Account.
 */

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  methodName?: string;
}

const POLYGONSCAN_AMOY_API = 'https://api-amoy.polygonscan.com/api';

export async function getTransactionHistory(address: string): Promise<Transaction[]> {
  // Note: Using public API without key might be rate-limited, but works for testing.
  // In production, move the API key to .env
  const url = `${POLYGONSCAN_AMOY_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY || ''}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }
    
    return [];
  } catch (error) {
    console.error('[Explorer] Failed to fetch transaction history:', error);
    return [];
  }
}
