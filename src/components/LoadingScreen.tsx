'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Artificial delay to ensure minimum animation visibility or wait for load
    const timer = setTimeout(() => setIsLoading(false), 2000);
    
    // Protection against right-click as requested
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
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505]"
        >
          {/* Central Animated Vector Logo (Minimalist simplification of BioVault icon) */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Spinning ambient ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/20"
            />
            
            {/* The Fingerprint/Shield Central Vector (Inlined for zero data/request overhead) */}
            <motion.svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ 
                scale: [0.8, 1, 0.8],
                opacity: [0.5, 1, 0.5],
                filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d="M12 2C6.47 2 2 6.47 2 12C2 17.53 6.47 22 12 22C17.53 22 22 17.53 22 12C22 6.47 17.53 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="url(#grad1)" />
              <path d="M12 7V17M7 12H17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 9C9 7.34315 10.3431 6 12 6C13.6569 6 15 7.34315 15 9V15C15 16.6569 13.6569 18 12 18C10.3431 18 9 16.6569 9 15V9Z" stroke="url(#grad2)" strokeWidth="1.5" />
              <defs>
                <linearGradient id="grad1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#6366F1" />
                </linearGradient>
                <linearGradient id="grad2" x1="9" y1="6" x2="15" y2="18" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60A5FA" />
                  <stop offset="1" stopColor="#A5B4FC" />
                </linearGradient>
              </defs>
            </motion.svg>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <h1 className="text-xl font-black tracking-[0.2em] text-white/90 uppercase">BioVault</h1>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.5em] mt-2">Initializing Enclave</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
