'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Artificial delay to ensure minimum animation visibility
    const timer = setTimeout(() => setIsLoading(false), 2500);
    
    // Protection against right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505]"
        >
          {/* Background Ambient Glow */}
          <div className="absolute w-[80%] h-[80%] bg-indigo-600/5 blur-[150px] rounded-full animate-pulse" />
          
          <div className="relative flex flex-col items-center gap-12">
            {/* Logo Container */}
            <div className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-10"
              >
                <div className="p-8 rounded-[3rem] bg-white/[0.03] border border-white/5 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <Image 
                    src="/bio_vault.svg" 
                    alt="BioVault Logo" 
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                </div>
              </motion.div>
              
              {/* Spinning Scanners */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-20px] rounded-full border border-indigo-500/10 border-t-indigo-500/40"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-40px] rounded-full border border-cyan-500/5 border-b-cyan-500/20"
              />
            </div>

            {/* Branding Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center space-y-4"
            >
              <h1 className="text-4xl font-outfit font-black tracking-tighter text-white/90 uppercase">
                BioVault
              </h1>
              <div className="flex flex-col items-center gap-3">
                <div className="h-[2px] w-48 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ left: '-100%' }}
                    animate={{ left: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                  />
                </div>
                <p className="text-[10px] font-black font-inter text-white/20 uppercase tracking-[0.6em]">
                  Initializing Protocol Enclave
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Security Mark */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-12 flex items-center gap-3 grayscale opacity-30"
          >
            <div className="h-[1px] w-12 bg-white/10" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">P256 Hardware Verified</span>
            <div className="h-[1px] w-12 bg-white/10" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
