'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ShieldCheck, AlertCircle, Loader2, CheckCircle2,
  Settings, History, CreditCard, Fingerprint, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/context/WalletContext';
import SwapModal from '@/components/SwapModal';
import PasskeyModal from '@/components/PasskeyModal';
import ThemeToggle from '@/components/ThemeToggle';
import { PUBLIC_CONFIG } from '@/config/env';

// Modular Components
import IdentityBadge from './dashboard/IdentityBadge';
import MetricCard from './dashboard/MetricCard';
import ActivityTable from './dashboard/ActivityTable';
import ActionPanel from './dashboard/ActionPanel';

// Types
import { Transaction } from './dashboard/ActivityTable';

export interface TransactionIntent {
  kind: 'transfer' | 'swap' | 'contract_call';
  to: string;
  value: bigint;
  data: string;
  label: string;
}

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
  const [transactionState, setTransactionState] = useState<'idle' | 'queued' | 'validating' | 'mined' | 'failed'>('idle');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [showSwap, setShowSwap] = useState(false);
  const [showPasskeys, setShowPasskeys] = useState(false);

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
  const loadTransactions = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoadingTransactions(true);
    try {
      const m = await import('@/lib/explorer');
      const txs = await m.getTransactionHistory(walletAddress);
      setTransactions(txs);
    } catch (e) {
      console.warn('[Dashboard] Explorer fetch failed:', e);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ── Send / Unified Intent Path ──────────────────────────────────────────────
  const handleSend = useCallback(async (intent?: TransactionIntent) => {
    if (!client || isSending) return;
    setSendError(null);
    setLastTxHash(null);
    setIsSending(true);
    setTransactionState('queued');

    try {
      setTransactionState('validating');
      const targetTo = intent?.to || walletAddress as `0x${string}`;
      const targetValue = intent?.value || BigInt(0);
      const targetData = (intent?.data as `0x${string}`) || '0x';

      const hash = await (client as any).sendTransaction({
        to: targetTo,
        value: targetValue,
        data: targetData,
      });

      setTransactionState('mined');
      setLastTxHash(hash);
      loadTransactions();
      fetchBalance();
    } catch (err: any) {
      setTransactionState('failed');
      setSendError(err?.message || 'Transaction failed');
    } finally {
      setIsSending(false);
      setShowSwap(false);
    }
  }, [client, isSending, walletAddress, loadTransactions, fetchBalance]);

  return (
    <div className="min-h-screen pt-12 pb-20 px-6 bg-[var(--background)]">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Top Header */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--foreground)] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[var(--background)]" />
                </div>
                <span className="text-xl font-outfit font-black tracking-tighter">BIOVAULT CORE</span>
            </div>
            <ThemeToggle />
        </div>

        <IdentityBadge 
          address={walletAddress} 
          status={status} 
          isDeployed={isDeployed} 
          onDisconnect={disconnect} 
        />

        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Metrics & Actions (Left) */}
          <div className="lg:col-span-4 space-y-8">
             <MetricCard 
                label="Available MATIC" 
                value={parseFloat(balance).toFixed(4)} 
                unit="MATIC" 
                icon={Wallet} 
                isLoading={status === 'connecting'} 
             />
             
             <ActionPanel 
                onSend={() => handleSend()} 
                onSwap={() => setShowSwap(true)} 
                onManageKeys={() => setShowPasskeys(true)} 
                isSending={isSending} 
                status={status} 
             />
          </div>

          {/* Activity & Details (Right) */}
          <div className="lg:col-span-8 space-y-8">
            <ActivityTable 
              transactions={transactions} 
              isLoading={isLoadingTransactions} 
              onRefresh={loadTransactions} 
              walletAddress={walletAddress} 
            />
            
            <div className="sharp-card grid grid-cols-2 gap-8 bg-[var(--muted)] border-none">
                <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Active Network</div>
                    <div className="text-xs font-bold">Polygon Amoy</div>
                </div>
                <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Protocol Logic</div>
                    <div className="text-xs font-bold">ERC-4337 v0.6</div>
                </div>
            </div>
          </div>
        </div>

        {/* Global Feedback HUD */}
        <AnimatePresence>
          {(lastError || sendError) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6"
            >
              <div className="flex items-start gap-4 p-4 bg-[var(--background)] border border-rose-500 text-rose-500 shadow-xl">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest">Protocol Intelligence Exception</div>
                  <div className="text-[10px] font-medium leading-relaxed opacity-80">{sendError || lastError}</div>
                </div>
              </div>
            </motion.div>
          )}

          {transactionState === 'mined' && lastTxHash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6"
            >
              <div className="flex items-center justify-between gap-6 p-4 bg-[var(--foreground)] text-[var(--background)] border-none shadow-xl">
                 <div className="flex items-center gap-4">
                    <CheckCircle2 className="w-5 h-5" />
                    <div className="space-y-0.5">
                       <div className="text-[10px] font-black uppercase tracking-widest leading-none">Broadcast Success</div>
                       <div className="text-[10px] font-bold">UserOperation Mined</div>
                    </div>
                 </div>
                 <button
                    onClick={() => window.open(`${PUBLIC_CONFIG.jiffyscanUrl}/${lastTxHash}?network=polygon-amoy`, '_blank')}
                    className="px-4 py-2 bg-[var(--background)] text-[var(--foreground)] font-black text-[9px] uppercase tracking-widest hover:brightness-90 transition-all"
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
