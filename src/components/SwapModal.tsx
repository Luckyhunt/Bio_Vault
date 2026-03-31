'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowDown, ShieldCheck, 
  RefreshCw, Info, Zap, Sparkles
} from 'lucide-react';

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
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden pointer-events-auto"
            >
              {/* Decorative Glows */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[90px] rounded-full -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 blur-[90px] rounded-full -ml-20 -mb-20" />
              
              {/* Header */}
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-outfit font-black tracking-tight flex items-center gap-3">
                    Asset Swap
                    <RefreshCw className="w-6 h-6 text-indigo-400" />
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Protocol Liquidity Layer</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5"
                  disabled={isSwapping}
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                {/* From Asset */}
                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Spending Asset</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">Balance: $100.00</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <input 
                      type="number" 
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      className="bg-transparent text-5xl font-outfit font-black tracking-tighter outline-none w-full text-white placeholder:text-white/10"
                    />
                    <div className="flex items-center gap-3 bg-white/[0.05] px-5 py-3 rounded-2xl border border-white/10 shadow-xl">
                      <div className="p-1.5 rounded-lg bg-indigo-500 text-white">
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="font-black text-sm tracking-tight">USD</span>
                    </div>
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center -my-10 relative z-20">
                  <div className="p-4 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <ArrowDown className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>

                {/* To Asset */}
                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Acquiring (Est.)</span>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 neon-pulse" />
                      Live Rates
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <div className="text-5xl font-outfit font-black tracking-tighter text-indigo-400">
                      {toAmount}
                    </div>
                    <div className="flex items-center gap-3 bg-indigo-500/20 px-5 py-3 rounded-2xl border border-indigo-500/20 shadow-xl">
                      <div className="p-1.5 rounded-lg bg-indigo-500 text-white">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-black text-sm tracking-tight text-white">MATIC</span>
                    </div>
                  </div>
                </div>

                {/* Protocol Info */}
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                    Exchange executed via <span className="text-white/60">BioVault Aggregator</span>. 
                    Network fees are <span className="text-emerald-400">fully sponsored</span> by the protocol paymaster.
                  </p>
                </div>

                {/* CTA */}
                <button 
                  onClick={handleSwap}
                  disabled={isSwapping}
                  className="btn-primary w-full py-6 text-lg tracking-tight shadow-[0_15px_40px_rgba(79,70,229,0.3)]"
                >
                  <div className="flex items-center justify-center gap-3">
                    {isSwapping ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-6 h-6" />
                        AUTHORIZE SWAP
                      </>
                    )}
                  </div>
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10">
                  Secure Biometric Authorization Required
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
