import { NextResponse } from 'next/server';
import { bundlerClient, publicClient, getSmartAccount, chain } from '@/lib/smart-wallet';
import { createSmartAccountClient } from 'permissionless';
import { http, Hex } from 'viem';
import { PUBLIC_CONFIG, SERVER_CONFIG } from '@/config/env';

export async function GET() {
  try {
    // 1. Check Bundler Connectivity
    try {
      const chainId = await bundlerClient.getChainId();
      if (chainId !== chain.id) {
        return NextResponse.json({ 
          status: 'degraded', 
          error: 'Bundler chain mismatch',
          expected: chain.id,
          actual: chainId 
        }, { status: 500 });
      }
    } catch (err: any) {
      return NextResponse.json({ 
        status: 'bundler_unreachable', 
        error: err.message 
      }, { status: 503 });
    }

    // 2. Simulate a dummy deployment UserOp
    const dummyId = 'health-check-dummy-' + Math.random().toString(36).slice(2);
    const dummyPubKey = '0x04' + '0'.repeat(128); 

    try {
      const account = await getSmartAccount(dummyId, dummyPubKey);
      
      const smartAccountClient = createSmartAccountClient({
        account,
        chain,
        bundlerTransport: http(SERVER_CONFIG.bundlerRpcUrl),
        paymaster: bundlerClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            const gas = await bundlerClient.getUserOperationGasPrice();
            return gas.fast;
          },
        },
      }) as any;

      // Prepare userOp to invoke paymaster implicitly
      try {
        const userOp = await smartAccountClient.prepareUserOperation({
          calls: [{ to: account.address, value: BigInt(0), data: '0x' }],
        });

        if (userOp) {
          return NextResponse.json({ 
            status: 'healthy', 
            paymaster: 'Pimlico',
            sponsorship: 'active',
            deployment_allowed: true 
          });
        }
      } catch (policyErr: any) {
        console.error('[Health] Policy reject:', policyErr.message);
        if (policyErr.message.includes('out of funds') || policyErr.message.includes('deposit')) {
          return NextResponse.json({ 
            status: 'out_of_funds', 
            error: 'Paymaster deposit insufficient' 
          }, { status: 500 });
        }
        return NextResponse.json({ 
          status: 'policy_blocked', 
          error: policyErr.message,
          hint: 'Check if initCode deployments are allowed in Pimlico dashboard' 
        }, { status: 500 });
      }
    } catch (accErr: any) {
      return NextResponse.json({ 
        status: 'error', 
        error: 'Account derivation failed during health check',
        details: accErr.message 
      }, { status: 500 });
    }

    return NextResponse.json({ status: 'healthy' });

  } catch (globalErr: any) {
    return NextResponse.json({ 
      status: 'error', 
      error: globalErr.message 
    }, { status: 500 });
  }
}
