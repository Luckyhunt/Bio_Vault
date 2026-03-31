'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Send, RefreshCw, History, CreditCard, Fingerprint,
  Info, ChevronRight, ExternalLink, AlertCircle, Loader2, CheckCircle2, Wifi, WifiOff,
  Copy, ShieldCheck, Zap, ArrowUpRight, ArrowDownLeft, Settings, LogOut
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/context/WalletContext';
import SwapModal from '@/components/SwapModal';
import PasskeyModal from '@/components/PasskeyModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TxRecord {
  hash: string;
  from: string;
  to: string;
  isError: string;
  timeStamp?: string;
  value?: string;
}

// ─── AA Error Message Mapper ──────────────────────────────────────────────────

function mapAAError(msg: string): string {
  if (msg.includes('AA13') || msg.includes('initCode'))
    return 'Smart account deployment failed (AA13). The paymaster may be underfunded — retry in a moment.';
  if (msg.includes('AA21') || msg.includes('didn\'t pay prefund'))
    return 'Paymaster rejected the UserOp (AA21). Gas sponsorship unavailable right now.';
  if (msg.includes('AA23') || msg.includes('reverted'))
    return 'Transaction simulation reverted (AA23). Check call data and target address.';
  if (msg.includes('AA25') || msg.includes('invalid account nonce'))
    return 'Nonce conflict (AA25). Another UserOp may be pending — wait and retry.';
  if (msg.includes('NotAllowedError') || msg.includes('cancelled'))
    return 'Biometric prompt was cancelled. Please try again.';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ETIMEDOUT'))
    return 'Network error — check your connection and retry.';
  if (msg.includes('bundler') || msg.includes('400') || msg.includes('rejected'))
    return 'Bundler rejected the UserOp. The paymaster may not cover this operation.';
  return msg;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard({ user }: { user: any }) {
  const {
    balance,
    client,
    isDeployed,
    address: walletAddress,
    status,
    lastError,
    connect,
    fetchBalance,
    disconnect,
  } = useWallet();

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [showSwap, setShowSwap] = useState(false);
  const [showPasskeys, setShowPasskeys] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // ── Wallet Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const initWallet = async () => {
      if (!user) return;
      const { data: passkeys, error } = await supabase
        .from('passkeys')
        .select('id, public_key')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !passkeys || passkeys.length === 0) return;
      const pk = passkeys[0];
      await connect(pk.id, pk.public_key);
    };
    initWallet();
  }, [user]);

  // ── Transaction history ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) return;
    import('@/lib/explorer')
      .then(m => m.getTransactionHistory(walletAddress))
      .then(setTransactions)
      .catch(e => console.warn('[Dashboard] Explorer fetch failed:', e.message));
  }, [walletAddress]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!client || isSending) return;
    setSendError(null);
    setLastTxHash(null);
    setIsSending(true);

    try {
      const hash = await (client as any).sendTransaction({
        to: walletAddress as `0x${string}`,
        value: BigInt(0),
        data: '0x' as `0x${string}`,
      });

      setLastTxHash(hash);
      if (walletAddress) {
        import('@/lib/explorer')
          .then(m => m.getTransactionHistory(walletAddress))
          .then(setTransactions)
          .catch(() => {});
      }
    } catch (err: any) {
      setSendError(mapAAError(err?.message || 'Transaction failed'));
    } finally {
      setIsSending(false);
      setShowSwap(false);
    }
  }, [client, isSending, walletAddress]);

  const copyToClipboard = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const displayAddress = walletAddress || user?.user_metadata?.wallet_address || '0x...';

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 font-inter bg-[#050505]">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <h1 className="text-4xl font-outfit font-black tracking-tight flex items-center gap-3">
              Vault Dashboard
              <span className="text-emerald-400 p-1.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
            </h1>
            <div className="flex items-center gap-3 text-white/40 text-sm font-medium">
              <span>Managed by Hardware Enclave</span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <button 
                onClick={copyToClipboard}
                className="hover:text-white transition-colors flex items-center gap-1.5"
              >
                {isCopied ? 'Copied!' : displayAddress.slice(0, 10) + '...' + displayAddress.slice(-6)}
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-rose-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {status === 'connected' ? (isDeployed ? 'On-Chain' : 'Counterfactual') : 'Disconnected'}
                </span>
             </div>
             <button 
              onClick={disconnect}
              className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Balance Tile (Span 7) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-7 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-800 p-10 relative overflow-hidden group shadow-[0_20px_50px_rgba(79,70,229,0.2)]"
          >
            {/* Geometric Orbs */}
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 blur-[80px] rounded-full group-hover:bg-white/20 transition-all duration-700" />
            <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-black/20 blur-[60px] rounded-full" />
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Current Liquidity</p>
                  <h2 className="text-6xl font-outfit font-black tracking-tighter">
                    {parseFloat(balance).toFixed(4)}
                    <span className="text-2xl text-white/30 ml-3 font-medium italic">MATIC</span>
                  </h2>
                </div>
                <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-xl">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="mt-20 flex flex-wrap gap-4">
                <button 
                  onClick={handleSend}
                  disabled={isSending || status !== 'connected'}
                  className="bg-white text-indigo-900 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-[1.05] active:scale-95 transition-all shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSending ? 'Signing Payload...' : 'Authorize Transaction'}
                </button>
                <button 
                  onClick={() => setShowSwap(true)}
                  className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-white/20 transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Asset Swap
                </button>
              </div>
            </div>
          </motion.div>

          {/* Biometric Status Tile (Span 5) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-5 glass-card p-8 flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 neon-pulse" />
                  Hardware Secure
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-outfit font-black tracking-tight uppercase">Protocol Profile</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Your wallet is uniquely forged from device enclaves using P256 elliptic curves. No private keys are visible or extractable.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
               <button 
                onClick={() => setShowPasskeys(true)}
                className="w-full flex items-center justify-between p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group"
               >
                 <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-white/80">Key Management</div>
                      <div className="text-[10px] text-white/30">1 Active Credential</div>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 transition-transform" />
               </button>
               
               <div className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/5 opacity-40">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest">Guardian Nodes</div>
                    <div className="text-[10px]">Unconfigured Layer</div>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Activity Feed (Span 8) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-8 glass-card p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-outfit font-black uppercase tracking-tight">Recent Activity</h3>
              </div>
              <button 
                onClick={fetchBalance}
                className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1">
              <AnimatePresence mode="popLayout">
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={tx.hash}
                      onClick={() => window.open(`https://amoy.polygonscan.com/tx/${tx.hash}`, '_blank')}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${tx.from?.toLowerCase() === displayAddress.toLowerCase() ? 'bg-indigo-500/10 text-indigo-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                          {tx.from?.toLowerCase() === displayAddress.toLowerCase() ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white/80 group-hover:text-white transition-colors">
                             {tx.from?.toLowerCase() === displayAddress.toLowerCase() ? 'Transaction Authorized' : 'Funds Received'}
                          </div>
                          <div className="text-[10px] text-white/30 font-mono tracking-wider truncate w-40">{tx.hash}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black ${tx.isError === '0' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.isError === '0' ? 'Confirmed' : 'Rejected'}
                        </div>
                        <div className="text-[10px] text-white/20 uppercase font-black">Polygon Amoy</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-4 py-20 opacity-20">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Syncing Protocol State...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Network Details (Span 4) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-4 glass-card p-8 flex flex-col"
          >
            <div className="flex-1 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-outfit font-black uppercase tracking-tight">Active Network</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
                      <span>Gateway RPC</span>
                      <span className="text-emerald-400">Optimized</span>
                    </div>
                    <div className="text-xs font-bold truncate text-white/60">amoy.polygon.technology</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
                      <span>Standard EntryPoint</span>
                    </div>
                    <div className="text-xs font-bold truncate text-white/60">0x5FF137D4b0FDCD49DcA30...</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <button 
                  onClick={() => window.open(`https://amoy.polygonscan.com/address/${displayAddress}`, '_blank')}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-indigo-400 hover:bg-white/5 transition-all"
                 >
                   <ExternalLink className="w-3.5 h-3.5" />
                   Review Ledger Explorer
                 </button>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Global Error Banner */}
        <AnimatePresence>
          {(lastError || sendError) && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-6"
            >
              <div className="flex items-start gap-4 p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-2xl backdrop-blur-2xl">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div className="space-y-1">
                  <div className="text-sm font-black uppercase tracking-widest">Protocol Intelligence Exception</div>
                  <div className="text-xs font-medium leading-relaxed opacity-80">{sendError || lastError}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UserOp Success HUD */}
        <AnimatePresence>
          {lastTxHash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-6"
            >
              <div className="flex items-center justify-between gap-6 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-2xl backdrop-blur-2xl">
                 <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Success Confirmation</div>
                      <div className="text-xs font-bold text-white">Biometric UserOperation Broadcast Complete</div>
                    </div>
                 </div>
                 <button
                    onClick={() => window.open(`https://jiffyscan.xyz/userOpHash/${lastTxHash}?network=polygon-amoy`, '_blank')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    View Status
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
    </div>
  );
}
