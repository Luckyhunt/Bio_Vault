'use client';

import { History, RefreshCw, Loader2, Info, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PUBLIC_CONFIG } from '@/config/env';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
}

interface ActivityTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRefresh: () => void;
  walletAddress: string | null;
}

export default function ActivityTable({ transactions, isLoading, onRefresh, walletAddress }: ActivityTableProps) {
  return (
    <div className="sharp-card flex flex-col h-full bg-[var(--background)]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-[var(--foreground)]" />
          <h3 className="text-xl font-outfit font-black uppercase tracking-tight">Activities</h3>
        </div>
        <button 
          onClick={onRefresh}
          className="p-1.5 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton w-full h-[72px]" />
              ))}
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((tx) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={tx.hash}
                onClick={() => window.open(`${PUBLIC_CONFIG.explorerTxUrl}${tx.hash}`, '_blank')}
                className="flex items-center justify-between p-4 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 border border-[var(--border)] ${tx.from?.toLowerCase() === walletAddress?.toLowerCase() ? 'bg-[var(--muted)]' : 'bg-[var(--foreground)] text-[var(--background)]'}`}>
                    {tx.from?.toLowerCase() === walletAddress?.toLowerCase() ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] transition-colors">
                       {tx.from?.toLowerCase() === walletAddress?.toLowerCase() ? 'Broadcast Authorized' : 'Funds Received'}
                    </div>
                    <div className="text-[10px] text-[var(--muted-fg)] font-mono tracking-wider truncate w-32 md:w-48">{tx.hash}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[10px] font-black uppercase tracking-widest ${tx.isError === '0' ? 'text-[var(--foreground)]' : 'text-rose-500'}`}>
                    {tx.isError === '0' ? 'Success' : 'Failed'}
                  </div>
                  <div className="text-[9px] text-[var(--muted-fg)] uppercase font-bold">Polygon Amoy</div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border)]">
              <Info className="w-5 h-5 text-[var(--muted-fg)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2rem] text-[var(--muted-fg)]">Zero Activity Detected</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
