'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, LogIn, UserPlus, Loader2, AlertCircle, WifiOff, ShieldCheck } from 'lucide-react';
import RegistrationForm from './RegistrationForm';
import { supabase } from '@/lib/supabase';

export default function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const optionsResp = await fetch('/api/auth/login/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      const options = await optionsResp.json();
      if (!optionsResp.ok || options.error) throw new Error(options.error || 'Server error');

      const authenticationResponse = await startAuthentication({ optionsJSON: options });

      const verifyResp = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          challenge: options.challenge,
          authenticationResponse,
        }),
      });

      const verification = await verifyResp.json();
      if (!verifyResp.ok || !verification.verified) throw new Error(verification.error || 'Verification failed');

      if (verification.sessionConfig) {
        const { error: sessionErr } = await supabase.auth.signInWithPassword({
          email: verification.sessionConfig.email,
          password: verification.sessionConfig.password,
        });
        if (sessionErr) throw new Error('Session establishment failed');
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--background)] p-1 border border-[var(--border-strong)]">
      {/* Switcher */}
      <div className="flex border-b border-[var(--border)] p-1">
        <button
          onClick={() => { setMode('register'); setErrorMsg(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'register' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--muted-fg)] hover:text-[var(--foreground)]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Enroll Device
        </button>
        <button
          onClick={() => { setMode('login'); setErrorMsg(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
            mode === 'login' ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--muted-fg)] hover:text-[var(--foreground)]'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Vault Entry
        </button>
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {mode === 'register' ? (
            <motion.div
              key="register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <RegistrationForm onComplete={() => setMode('login')} />
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-10"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 border border-[var(--border-strong)] mx-auto">
                    {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Fingerprint className="w-8 h-8" />}
                </div>
                <h2 className="text-2xl font-outfit font-black tracking-tight uppercase">IDENTITY VERIFICATION</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-fg)]">Enter unique identifier to scan</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)] ml-1">
                    Vault Username
                  </label>
                  <input
                    type="text"
                    placeholder="UID..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="input-elite"
                    disabled={isLoading}
                    required
                    autoComplete="username webauthn"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="btn-solid w-full py-5 text-sm tracking-tight"
                >
                  {isLoading ? 'VERIFYING...' : 'AUTHENTICATE'}
                </button>

                <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 border border-rose-500 text-rose-500 text-[10px] font-bold uppercase tracking-widest"
                    >
                      {errorMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
