'use client';

import { Send, RefreshCw, Fingerprint, Zap, Loader2, ChevronRight } from 'lucide-react';

interface ActionPanelProps {
  onSend: () => void;
  onSwap: () => void;
  onManageKeys: () => void;
  isSending: boolean;
  status: string;
}

export default function ActionPanel({ onSend, onSwap, onManageKeys, isSending, status }: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="sharp-card flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="p-3 border border-[var(--border)] w-fit">
            <Zap className="w-5 h-5 text-[var(--foreground)]" />
          </div>
          <h3 className="text-xl font-outfit font-black uppercase tracking-tight leading-none">Authorization Center</h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted-fg)] leading-relaxed">
            Execute sponsored transactions via hardware secure enclave. 
            Zero gas fee on Polygon Amoy.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button 
            onClick={onSend}
            disabled={isSending || status !== 'connected'}
            className="w-full btn-solid py-4 text-xs font-black tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group transition-all"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {isSending ? 'Verifying...' : 'Authorize Send'}
          </button>
          <button 
             onClick={onSwap}
             className="w-full btn-outline py-4 text-xs font-black tracking-[0.2em] flex items-center justify-center gap-3 group transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Initiate Swap
          </button>
        </div>
      </div>

      <div className="sharp-card flex flex-col justify-between hover:bg-[var(--muted)] transition-all cursor-pointer group" onClick={onManageKeys}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 border border-[var(--border)] group-hover:border-[var(--border-strong)] transition-all">
                    <Fingerprint className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                    <div className="text-[10px] font-black uppercase tracking-widest leading-none">Security Hardware</div>
                    <div className="text-[9px] text-[var(--muted-fg)] font-bold uppercase tracking-widest">Manage Passkeys</div>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--muted-fg)] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
