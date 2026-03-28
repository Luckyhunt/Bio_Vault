import AuthPanel from '@/components/AuthPanel';
import { ShieldCheck, Zap, Globe, Lock } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-24">
          <div className="flex items-center gap-3">
            <Image 
              src="/bio_vault.svg" 
              alt="BioVault Logo" 
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              BioVault
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#" className="hover:text-white transition-colors">Architecture</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Open Source</a>
          </div>
        </nav>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Zap className="w-3 h-3 fill-current" />
              The Future of Web3 Security is Seedless
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
              Your Body is the <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Private Key.</span>
            </h1>
            <p className="text-xl text-white/50 max-w-lg leading-relaxed">
              BioVault leverages hardware-grade biometric enclaves to create decentralized wallets. No seed phrases. No passwords. Just you.
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Lock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Passkey Native</h3>
                  <p className="text-xs text-white/40">FIDO2 & WebAuthn standard</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">ERC-4337 Ready</h3>
                  <p className="text-xs text-white/40">Smart Account Abstraction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Panel */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2rem] blur-xl opacity-20" />
            <AuthPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
