'use client';

import AuthPanel from '@/components/AuthPanel';
import { ShieldCheck, Zap, Globe, Lock, Fingerprint, ChevronRight, Binary, Shield } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden font-inter">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-violet-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="fixed inset-0 opacity-20 pointer-events-none mix-blend-overlay" 
        style={{ backgroundImage: NOISE_SVG }}
      />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 pt-8 pb-32">
        {/* Navigation */}
        <header className="flex items-center justify-between mb-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <div className="relative group">
              <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md group-hover:bg-indigo-500/40 transition-all duration-300" />
              <Image 
                src="/bio_vault.svg" 
                alt="BioVault Logo" 
                width={50}
                height={50}
                className="relative object-contain"
                priority
              />
            </div>
            <span className="text-3xl font-outfit font-black tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
              BioVault
            </span>
          </motion.div>
          
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-white/40"
          >
            <a href="#" className="hover:text-indigo-400 transition-colors uppercase">Network</a>
            <a href="#" className="hover:text-indigo-400 transition-colors uppercase">Protocol</a>
            <a href="#" className="hover:text-indigo-400 transition-colors uppercase">Security</a>
            <div className="h-4 w-[1px] bg-white/10" />
            <a href="https://github.com/Luckyhunt/Bio_Vault" target="_blank" className="flex items-center gap-2 hover:text-white transition-colors">
              <Binary className="w-4 h-4" />
              Source
            </a>
          </motion.nav>
        </header>

        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Hero Content */}
          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                <Shield className="w-3 h-3" />
                Next-Gen Biometric Custody
              </div>
              
              <h1 className="text-7xl md:text-[6.5rem] font-outfit font-black tracking-tighter leading-[0.85] text-white">
                THE BODY IS THE <span className="text-indigo-500 inline-block relative">
                  PRIVATE KEY
                  <div className="absolute -bottom-4 left-0 w-full h-1.5 bg-indigo-500 rounded-full blur-[2px] opacity-20" />
                </span>
              </h1>
              
              <p className="text-lg text-white/50 max-w-lg leading-relaxed font-medium">
                Eliminate seed phrases forever. BioVault leverages hardware secure enclaves to forge non-custodial wallets protected by the math of your own identity.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap gap-4"
            >
              <button className="btn-primary group flex items-center gap-3">
                Initialize Secure Vault
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all font-bold text-sm">
                Explore Protocol
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-10 pt-8 border-t border-white/5"
            >
              <div className="space-y-2">
                <div className="text-cyan-400 font-outfit font-black text-2xl">FIDO2</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">WebAuthn Standard</div>
              </div>
              <div className="space-y-2">
                <div className="text-emerald-400 font-outfit font-black text-2xl">4337</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Account Abstraction</div>
              </div>
              <div className="hidden md:block space-y-2">
                <div className="text-indigo-400 font-outfit font-black text-2xl">P256</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Enclave Verified</div>
              </div>
            </motion.div>
          </div>

          {/* Auth Display Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Decorative Glow */}
            <div className="absolute -inset-10 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-white/5 rounded-[3rem] animate-pulse pointer-events-none" />
            
            <div className="relative glass-card p-2 md:p-6 shadow-[0_0_80px_rgba(0,0,0,0.4)]">
               <AuthPanel />
            </div>

            {/* Subtle Security Badge */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full glass-card border-none text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 neon-pulse" />
              Protocol Secured by Hardware Enclave
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <footer className="container mx-auto px-6 py-12 flex justify-center opacity-20 hover:opacity-50 transition-opacity">
        <div className="flex items-center gap-2 font-outfit font-black text-sm tracking-tighter grayscale">
          <Image src="/bio_vault.svg" alt="BioVault" width={20} height={20} />
          DECENTRALIZED IDENTITY SYSTEM v1.0
        </div>
      </footer>
    </main>
  );
}
