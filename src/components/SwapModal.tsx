'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowDown, ShieldCheck, 
  RefreshCw, Info 
} from 'lucide-react';
import Image from 'next/image';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SwapModal({ isOpen, onClose, onConfirm }: SwapModalProps) {
  const [fromAmount, setFromAmount] = useState('100');
  const [toAmount, setToAmount] = useState('0.042');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = async () => {
    setIsSwapping(true);
    await onConfirm(); // Triggers the biometric flow in Dashboard
    setIsSwapping(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-indigo-400" />
                DEX Swap
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                disabled={isSwapping}
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {/* From Asset */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-white/40 uppercase tracking-widest">
                  <span>From</span>
                  <span>Balance: $100.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <input 
                    type="number" 
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="bg-transparent text-3xl font-black tracking-tighter outline-none w-full"
                  />
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                    <span className="font-bold">USD</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center -my-6 relative z-10">
                <div className="p-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl">
                  <ArrowDown className="w-4 h-4 text-indigo-400" />
                </div>
              </div>

              {/* To Asset */}
              <div className="p-6 rounded-3xl bg-white/10 border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-white/40 uppercase tracking-widest">
                  <span>To (Estimated)</span>
                  <span>Pool: 12.5k MATIC</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-3xl font-black tracking-tighter opacity-80">{toAmount}</div>
                  <div className="flex items-center gap-2 bg-indigo-500/20 px-3 py-2 rounded-xl border border-indigo-500/20">
                    <span className="font-bold text-indigo-400">MATIC</span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3">
                <Info className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                  Slippage tolerance: 0.5%. Your gas is sponsored by BioVault Paymaster. No MATIC required for fee.
                </p>
              </div>

              {/* Main Action */}
              <button 
                onClick={handleSwap}
                disabled={isSwapping}
                className="w-full py-5 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-lg transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isSwapping ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-6 h-6" />
                    Authorize Swap
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
