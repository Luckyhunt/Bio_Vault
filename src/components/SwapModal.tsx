'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDown, RefreshCw, AlertCircle } from 'lucide-react';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SwapModal({ isOpen, onClose, onConfirm }: SwapModalProps) {
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = async () => {
    if (!amount || isSwapping) return;
    setIsSwapping(true);
    // Simulate thinking/quoting
    await new Promise(r => setTimeout(r, 1000));
    onConfirm();
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
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-blue-400" />
                Token Swap
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {/* From Asset */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs font-bold text-white/40 mb-3 uppercase tracking-wider">
                  <span>Pay</span>
                  <span>Balance: 0.00 POL</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="bg-transparent text-3xl font-bold w-full outline-none placeholder:text-white/10"
                  />
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center gap-2">
                    POL
                  </div>
                </div>
              </div>

              {/* Arrow Spacer */}
              <div className="flex justify-center -my-6 relative z-20">
                <div className="p-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl">
                  <ArrowDown className="w-4 h-4 text-blue-400" />
                </div>
              </div>

              {/* To Asset */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs font-bold text-white/40 mb-3 uppercase tracking-wider">
                  <span>Receive</span>
                  <span>Est. Value</span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    disabled
                    value={amount ? (Number(amount) * 0.82).toFixed(4) : ''}
                    placeholder="0.0"
                    className="bg-transparent text-3xl font-bold w-full outline-none text-white/40"
                  />
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center gap-2">
                    USDC
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 mt-6">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-[11px] text-blue-400/80 font-medium leading-relaxed">
                  Swap will be executed via Uniswap V3. Biometric authorization is required to approve the transaction.
                </p>
              </div>

              <button
                onClick={handleSwap}
                disabled={!amount || isSwapping}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.5rem] font-bold text-lg hover:scale-[1.02] transition-all shadow-xl shadow-blue-500/20 mt-8 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSwapping ? 'Processing...' : 'Review Swap'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
