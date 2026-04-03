import { NextResponse } from 'next/server';
import { getTransactionHistory } from '@/lib/explorer';

/**
 * Secure Etherscan Proxy API
 * Prevents the private ETHERSCAN_API_KEY from leaking to the browser.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Since this is a server route, getTransactionHistory will execute 
    // the server-side branch using the private SERVER_CONFIG.etherscanApiKey.
    const transactions = await getTransactionHistory(address);
    
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API History Proxy] Failed:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch transaction history from explorer protocol',
      details: error.message 
    }, { status: 500 });
  }
}
