'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, CheckCircle2, AlertCircle, Loader2, Shield, Zap, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RegistrationForm() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setIsLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const optionsResp = await fetch('/api/auth/register/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const options = await optionsResp.json();
      if (options.error) throw new Error(options.error);

      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      setStatus('verifying');

      const verifyResp = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          challenge: options.challenge,
          attestationResponse,
        }),
      });

      const verification = await verifyResp.json();

      if (verification.verified) {
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const msg = verification.error || 'Identity verification failed';
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error('[Register] Error:', err);
      setStatus('error');
      
      if (err.message.includes('429') || err.message.includes('Too many')) {
        setErrorMsg('Security Guard: Too many attempts. Please wait 5 minutes.');
      } else if (err.message.includes('NotAllowedError') || err.message.includes('cancelled')) {
        setErrorMsg('Biometric prompt was cancelled. Creation aborted.');
      } else {
        setErrorMsg(err.message || 'Vault initialization failed. Please retry.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full" />

      <div className="text-center mb-10 relative z-10">
        <div className="relative inline-block mb-6">
          <motion.div
            animate={status === 'scanning' ? {
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`inline-flex items-center justify-center p-6 rounded-[2rem] border transition-all duration-500 ${
              status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              status === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
              'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`}
          >
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key="success">
                  <CheckCircle2 className="w-14 h-14" />
                </motion.div>
              ) : status === 'error' ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key="error">
                  <AlertCircle className="w-14 h-14" />
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key="idle" className="relative">
                  <Fingerprint className="w-14 h-14" />
                  {status === 'scanning' && (
                    <motion.div 
                      className="absolute inset-0 border-t-2 border-indigo-400 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          {/* Scanning Beam Effect */}
          {status === 'scanning' && (
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute left-0 w-full h-0.5 bg-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20 pointer-events-none"
            />
          )}
        </div>

        <h2 className="text-4xl font-outfit font-black text-white mb-3 tracking-tight">Initialize Vault</h2>
        <p className="text-white/40 font-medium">Link your biometrics to a new decentralized identity</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">
            Choose Vault Username
          </label>
          <div className="relative group">
            <input
              id="username"
              type="text"
              placeholder="e.g. Satoshi"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 group-hover:bg-white/[0.05]"
              disabled={isLoading || status === 'success'}
              required
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || status === 'success'}
          className="btn-primary w-full py-6 text-lg tracking-tight"
        >
          <div className="flex items-center justify-center gap-3">
            {isLoading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> {status.toUpperCase()}...</>
            ) : status === 'success' ? (
              'VAULT INITIALIZED'
            ) : (
              <>
                <Shield className="w-6 h-6" />
                CONFIRM IDENTITY
              </>
            )}
          </div>
        </button>

        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-3 text-rose-400 text-xs font-bold bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="w-3 h-3" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Zero Secret</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Shield className="w-3 h-3" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">P256 Proof</span>
          </div>
        </div>
      </form>
      
      <div className="mt-10 text-center opacity-20 hover:opacity-40 transition-opacity">
        <p className="text-[10px] uppercase tracking-[0.3em] font-black italic">
          Forge Non-Custodial Hardware Keys
        </p>
      </div>
    </div>
  );
}
