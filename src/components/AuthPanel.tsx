'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, LogIn, UserPlus, Loader2, AlertCircle, WifiOff, ShieldCheck } from 'lucide-react';
import RegistrationForm from './RegistrationForm';

// ─── Error Mapper ─────────────────────────────────────────────────────────────

function mapLoginError(err: any): string {
  const msg: string = err?.message || '';
  if (err?.name === 'NotAllowedError' || msg.includes('cancelled') || msg.includes('denied'))
    return 'Biometric prompt was cancelled. Please try again.';
  if (err?.name === 'SecurityError')
    return 'Security error — ensure you are on the correct domain (HTTPS).';
  if (err?.name === 'NotSupportedError')
    return 'Passkeys are not supported on this device or browser.';
  if (msg.includes('No passkeys') || msg.includes('not found') || msg.includes('404'))
    return 'No registered passkey found. Did you register on this device?';
  if (msg.includes('Vault not found'))
    return 'Username not recognised. Check spelling or register a new vault.';
  if (msg.includes('mismatch'))
    return 'Username doesn\'t match the registered passkey credential.';
  if (msg.includes('expired'))
    return 'The authentication window expired. Please try again.';
  if (msg.includes('Too many') || msg.includes('429'))
    return 'Too many attempts. Please wait 5 minutes before retrying.';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ETIMEDOUT'))
    return 'Network error — check your connection and retry.';
  if (msg.includes('replay') || msg.includes('Security violation'))
    return 'Security violation detected. Please contact support.';
  return msg || 'Authentication failed. Please try again.';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setIsNetworkError(false);

    try {
      const optionsResp = await fetch('/api/auth/login/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      const options = await optionsResp.json();

      if (!optionsResp.ok || options.error) {
        throw new Error(options.error || `Server error ${optionsResp.status}`);
      }

      let authenticationResponse;
      try {
        authenticationResponse = await startAuthentication({ optionsJSON: options });
      } catch (webAuthnErr: any) {
        throw webAuthnErr;
      }

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

      if (!verifyResp.ok || !verification.verified) {
        throw new Error(verification.error || `Verification failed (${verifyResp.status})`);
      }

      if (verification.redirectUrl) {
        window.location.href = verification.redirectUrl;
      } else {
        window.location.href = '/dashboard';
      }

    } catch (err: any) {
      const friendly = mapLoginError(err);
      const isNet = err?.message?.includes('fetch') || err?.message?.includes('network') || err?.message?.includes('ETIMEDOUT');
      setIsNetworkError(isNet);
      setErrorMsg(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Tab Switcher */}
      <div className="flex bg-white/[0.03] p-1.5 rounded-2xl mb-8 border border-white/5 backdrop-blur-xl">
        <button
          onClick={() => { setMode('register'); setErrorMsg(''); }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            mode === 'register' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-white/30 hover:text-white/60'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Join Network
        </button>
        <button
          onClick={() => { setMode('login'); setErrorMsg(''); }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
            mode === 'login' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-white/30 hover:text-white/60'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Access Vault
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'register' ? (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <RegistrationForm />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="w-full bg-white/[0.02] backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />
            
            <div className="text-center mb-10 relative z-10">
              <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20">
                {isLoading
                  ? <Loader2 className="w-12 h-12 animate-spin" />
                  : <Fingerprint className="w-12 h-12" />
                }
              </div>
              <h2 className="text-4xl font-outfit font-black text-white mb-3 tracking-tight">Welcome Back</h2>
              <p className="text-white/40 font-medium">Verify identity to decrypt your local vault</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">
                  Vault Username
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Enter unique id"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full px-6 py-5 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 group-hover:bg-white/[0.05]"
                    disabled={isLoading}
                    required
                    autoComplete="username webauthn"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="btn-primary w-full py-6 text-lg tracking-tight"
              >
                <div className="flex items-center justify-center gap-3">
                  {isLoading
                    ? <><Loader2 className="w-6 h-6 animate-spin" /> VERIFYING...</>
                    : <><Fingerprint className="w-6 h-6" /> AUTHENTICATE</>
                  }
                </div>
              </button>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 text-rose-400 text-xs font-bold bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                      {isNetworkError
                        ? <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
                        : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      }
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="pt-4 flex items-center justify-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                End-to-End Encrypted Session
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
