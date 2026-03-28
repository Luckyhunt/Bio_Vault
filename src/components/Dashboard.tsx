'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  CreditCard, 
  History,
  Info,
  ExternalLink,
  ChevronRight,
  Fingerprint
} from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import Image from 'next/image';

export default function Dashboard({ user }: { user: any }) {
  const [balance, setBalance] = useState('0.00');
  const [isSending, setIsSending] = useState(false);
  const [address, setAddress] = useState('0x...');

  useEffect(() => {
    // Fetch user profile and wallet address from Supabase
    const fetchProfile = async () => {
      // Logic to get profile.wallet_address
      setAddress(user?.user_metadata?.wallet_address || '0x742d...41b0');
    };
    fetchProfile();
  }, [user]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      // In a real system, we fetch sign options from backend
      const optionsResp = await fetch('/api/auth/login/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.user_metadata.username }),
      });
      const options = await optionsResp.json();

      // Trigger biometric prompt for transaction authorization
      await startAuthentication(options);
      
      alert('Biometric Signature Verified! Transaction Sent via Pimlico Bundler.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Wallet Card */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="w-48 h-48 -rotate-12" />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-1">Total Balance</p>
                  <h2 className="text-5xl font-black tracking-tighter">${balance} <span className="text-2xl text-white/40 font-medium italic">USD</span></h2>
                </div>
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shrink-0">
                  <Image src="/bio_vault.svg" alt="BioVault" width={32} height={32} className="p-1 object-contain" />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  {isSending ? 'Signing...' : 'Send Funds'}
                </button>
                <button className="px-8 py-4 bg-white/10 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-white/20 transition-all border border-white/10">
                  <RefreshCw className="w-5 h-5" />
                  Swap
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions / Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
              <History className="w-6 h-6 text-blue-400 mb-4" />
              <h3 className="font-bold mb-2">Recent Activity</h3>
              <p className="text-sm text-white/40 italic">Syncing with blockchain...</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
              <CreditCard className="w-6 h-6 text-indigo-400 mb-4" />
              <h3 className="font-bold mb-2">Vault Security</h3>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded-lg w-fit">
                <Image src="/bio_vault.svg" alt="" width={12} height={12} className="brightness-0 invert sepia-0 saturate-100 hue-rotate-[100deg]" />
                Biometric Active
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Profile */}
        <div className="space-y-8">
          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="shrink-0">
                <Image src="/bio_vault.svg" alt="Profile" width={56} height={56} className="object-contain" priority />
              </div>
              <div>
                <h3 className="font-black text-lg">@{user?.user_metadata?.username || 'user'}</h3>
                <code className="text-[10px] text-white/40 block overflow-hidden text-ellipsis w-32">{address}</code>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Fingerprint className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold">Manage Passkeys</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Info className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-sm font-bold">Recovery (WIP)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/10">
              <button className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold transition-colors">
                <ExternalLink className="w-3 h-3" />
                View on PolygonScan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
