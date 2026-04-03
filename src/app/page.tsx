'use client';

import AuthPanel from '@/components/AuthPanel';
import { ShieldCheck, Binary, ChevronRight, Fingerprint } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { PUBLIC_CONFIG } from '@/config/env';

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--foreground)] selection:text-[var(--background)] font-inter">
      
      {/* Grid Pattern Overlay (Minimal) */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(var(--foreground),0.02)_1px,transparent_0)] bg-[size:40px_40px] pointer-events-none opacity-20" />

      <div className="relative z-10 container mx-auto px-6 pt-12 pb-32">
        {/* Navigation */}
        <header className="flex items-center justify-between mb-24 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4"
          >
            <div className="relative border border-[var(--border-strong)] p-1">
              <Image 
                src="/bio_vault.svg" 
                alt="BioVault" 
                width={36}
                height={36}
                className="relative object-contain invert dark:invert-0"
                priority
              />
            </div>
            <span className="text-2xl font-outfit font-black tracking-tighter uppercase">
              BioVault
            </span>
          </motion.div>
          
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-widest text-[var(--muted-fg)]"
          >
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">Infrastructure</a>
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">Protocol</a>
            <div className="h-4 w-[1px] bg-[var(--border)]" />
            <a href={PUBLIC_CONFIG.githubUrl} target="_blank" className="flex items-center gap-2 hover:text-[var(--foreground)] transition-colors">
              <Binary className="w-3.5 h-3.5" />
              OSS Source
            </a>
          </motion.nav>
        </header>

        <div className="grid lg:grid-cols-2 gap-24 items-start">
          {/* Hero Content */}
          <div className="space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--border-strong)] text-[10px] font-black uppercase tracking-[0.2em]">
                <ShieldCheck className="w-3 h-3" />
                Production Grade Biometrics
              </div>
              
              <h1 className="text-6xl md:text-[8rem] font-outfit font-black tracking-tighter leading-[0.8] uppercase">
                IDENTITY <br />
                AS THE <br />
                <span className="text-[var(--muted-fg)]">KEY</span>
              </h1>
              
              <p className="text-sm text-[var(--muted-fg)] max-w-md leading-relaxed font-bold uppercase tracking-wider">
                Eliminate seed phrases and fragile custody. BioVault forges non-custodial smart accounts protected by the cryptographic hardware of your own identity.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <button className="btn-solid group flex items-center gap-3">
                Setup Secure Vault
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="btn-outline">
                Documentation
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-12 pt-12 border-t border-[var(--border)]"
            >
              <div className="space-y-2">
                <div className="font-outfit font-black text-xl leading-none">FIDO2</div>
                <div className="text-[9px] font-black text-[var(--muted-fg)] uppercase tracking-widest leading-none">Hardware Standard</div>
              </div>
              <div className="space-y-2">
                <div className="font-outfit font-black text-xl leading-none">4337</div>
                <div className="text-[9px] font-black text-[var(--muted-fg)] uppercase tracking-widest leading-none">Logic-First Wallet</div>
              </div>
              <div className="hidden md:block space-y-2">
                <div className="font-outfit font-black text-xl leading-none">P256</div>
                <div className="text-[9px] font-black text-[var(--muted-fg)] uppercase tracking-widest leading-none">Native Verification</div>
              </div>
            </motion.div>
          </div>

          {/* Auth Display Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative lg:mt-12"
          >
            <div className="relative border border-[var(--border-strong)] p-1 bg-[var(--background)]">
               <AuthPanel />
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-[9px] font-black text-[var(--muted-fg)] uppercase tracking-[0.3em]">
              <div className="w-1.5 h-1.5 bg-[var(--foreground)]" />
              End-to-End Cryptographic Session
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <footer className="container mx-auto px-6 py-16 flex justify-between items-center border-t border-[var(--border)] opacity-40">
        <div className="flex items-center gap-2 font-outfit font-black text-[10px] tracking-tighter uppercase grayscale">
          <Image src="/bio_vault.svg" alt="BioVault" width={18} height={18} className="invert dark:invert-0" />
          Protocol System v1.02
        </div>
        <div className="text-[9px] font-black uppercase tracking-widest">
          © 2026 BioVault Labs
        </div>
      </footer>
    </main>
  );
}
