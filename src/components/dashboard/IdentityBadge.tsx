'use client';

import { useState } from 'react';
import { Copy, ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

interface IdentityBadgeProps {
  address: string | null;
  status: string;
  isDeployed: boolean;
  onDisconnect: () => void;
}

export default function IdentityBadge({ address, status, isDeployed, onDisconnect }: IdentityBadgeProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const displayAddress = address || '0x...';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--border)]">
      <div className="space-y-1">
        <h1 className="text-3xl font-outfit font-black tracking-tight flex items-center gap-2">
          VAULT
          <ShieldCheck className="w-5 h-5 text-[var(--foreground)]" />
        </h1>
        <div className="flex items-center gap-3 text-[var(--muted-fg)] text-[10px] font-bold uppercase tracking-widest">
          <span>Enclave Secured</span>
          <div className="w-1 h-1 rounded-full bg-[var(--border)]" />
          <button 
            onClick={copyToClipboard}
            className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5"
          >
            {isCopied ? 'Copied' : displayAddress.slice(0, 6) + '...' + displayAddress.slice(-4)}
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
         <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]">
            <div className={`w-1.5 h-1.5 ${status === 'connected' ? 'bg-[var(--foreground)] shadow-[0_0_5px_var(--foreground)]' : 'bg-[var(--border)]'}`} />
            <span>
              {status === 'connected' ? (isDeployed ? 'On-Chain' : 'Pending Deployment') : 'Disconnected'}
            </span>
         </div>
         <button 
          onClick={onDisconnect}
          className="p-2 border border-[var(--border)] hover:bg-[var(--muted)] transition-all"
         >
           <LogOut className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
}
