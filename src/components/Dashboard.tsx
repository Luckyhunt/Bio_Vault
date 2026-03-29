'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Send, RefreshCw, History, CreditCard, Fingerprint, 
  Info, ChevronRight, ExternalLink 
} from 'lucide-react';
import Image from 'next/image';
import { Hex } from 'viem';
import { supabase } from '@/lib/supabase';
import { createPasskeySmartAccountClient } from '@/lib/smart-wallet';
import SwapModal from '@/components/SwapModal';
import PasskeyModal from '@/components/PasskeyModal';

export default function Dashboard({ user }: { user: any }) {
  const [balance, setBalance] = useState('0.15'); // Mocked balance for UI
  const [isSending, setIsSending] = useState(false);
  const [address, setAddress] = useState('0x...');
  const [passkey, setPasskey] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showSwap, setShowSwap] = useState(false);
  const [showPasskeys, setShowPasskeys] = useState(false);

  useEffect(() => {
    const initWallet = async () => {
      if (!user) return;
      
      const { data: passkeys, error } = await supabase
        .from('passkeys')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (error || !passkeys || passkeys.length === 0) {
        setAddress('Account Not Ready');
        return;
      }

      const pk = passkeys[0];
      setPasskey(pk);
      const addr = user?.user_metadata?.wallet_address || '0x...';
      setAddress(addr);

      // Fetch live transaction history from on-chain
      import('@/lib/explorer').then(m => m.getTransactionHistory(addr)).then(setTransactions);
    };
    initWallet();
  }, [user]);

  const handleSend = async () => {
    if (!passkey || isSending) return;
    
    setIsSending(true);
    try {
      console.log('[Dashboard] Initializing Passkey Client...');
      const client = await createPasskeySmartAccountClient(
        passkey.id, 
        passkey.public_key
      );

      console.log('[Dashboard] Identity Audit:', {
        derived: client.account.address,
        stored: address
      });

      console.log('[Dashboard] Signing Transaction...');
      // ARCHITECTURAL FIX: Force high gas limits for the first-time deployment simulation
      const hash = await (client as any).sendTransaction({
        to: client.account.address,
        value: BigInt(0),
        data: '0x',
        verificationGasLimit: BigInt(1500000), // High limit for P-256 + Factory
        preVerificationGas: BigInt(100000),
      });

      console.log('[Dashboard] Tx Hash:', hash);
      alert(`Success! Biometric Transaction Authorized!\nHash: ${hash}`);
      
      import('@/lib/explorer').then(m => m.getTransactionHistory(address)).then(setTransactions);
    } catch (err: any) {
      console.error('[Dashboard] Transaction Failure:', err);
      // Detailed error hints for ERC-4337 simulation
      const hint = err.message.includes('AA13') ? '\n\nHint: Smart Account Initialization failed. Checking gas sponsorship.' : '';
      alert(`Transaction Error: ${err.message}${hint}`);
    } finally {
      setIsSending(false);
      setShowSwap(false);
    }
  };


  const openExplorer = () => {
    if (address && address.startsWith('0x')) {
      window.open(`https://amoy.polygonscan.com/address/${address}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="grid lg:grid-cols-3 gap-8 text-white">
          {/* Main Wallet Card */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-800 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Wallet className="w-48 h-48 -rotate-12" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">Vault Balance</p>
                    <h2 className="text-5xl font-black tracking-tighter">${balance} <span className="text-2xl text-white/40 font-medium italic">USD</span></h2>
                  </div>
                  <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                    <Image src="/bio_vault.svg" alt="BioVault" width={32} height={32} className="p-1" />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={handleSend}
                    disabled={isSending}
                    className="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    {isSending ? 'Signing...' : 'Send Funds'}
                  </button>
                  <button 
                    onClick={() => setShowSwap(true)}
                    className="px-8 py-4 bg-white/10 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-white/20 transition-all border border-white/10"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Swap
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Live Activity Feed */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md max-h-[400px] overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-6 h-6 text-blue-400" />
                  <h3 className="font-bold">Recent Activity</h3>
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 5).map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-white/80">
                            {tx.from.toLowerCase() === address.toLowerCase() ? 'Send' : 'Receive'}
                          </span>
                          <span className="text-white/40 truncate w-32">{tx.hash}</span>
                        </div>
                        <span className="font-medium text-emerald-400">
                          {tx.isError === '0' ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-white/40 italic">Syncing with blockchain...</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <CreditCard className="w-6 h-6 text-emerald-400 mb-4" />
                <h3 className="font-bold mb-2">Biometric Vault</h3>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded-lg w-fit">
                  Hardware Secure Enclave Active
                </div>
              </div>
            </div>
          </div>

          {/* User Profile Column */}
          <div className="space-y-8">
            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
              <div 
                className="flex items-center gap-4 mb-8 cursor-pointer hover:bg-white/5 p-2 rounded-2xl transition-colors group"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  alert('Address copied!');
                }}
              >
                <div className="shrink-0">
                  <Image src="/bio_vault.svg" alt="Profile" width={56} height={56} />
                </div>
                <div>
                  <h3 className="font-black text-lg">@{user?.user_metadata?.username || 'lucky'}</h3>
                  <code className="text-[10px] text-white/40 block overflow-hidden text-ellipsis w-32">{address}</code>
                </div>
              </div>

              <div className="space-y-4">
                <div 
                  onClick={() => setShowPasskeys(true)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Fingerprint className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-bold">Manage Passkeys</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-xl">
                      <Info className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-sm font-bold italic">Guardian Recovery</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/10">
                <button 
                  onClick={openExplorer}
                  className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on PolygonScan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SwapModal 
        isOpen={showSwap} 
        onClose={() => setShowSwap(false)} 
        onConfirm={handleSend} 
      />
      
      <PasskeyModal 
        isOpen={showPasskeys} 
        onClose={() => setShowPasskeys(false)} 
        user={user} 
      />
    </>
  );
}
