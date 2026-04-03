'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, CheckCircle2, AlertCircle, Loader2, Shield, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface RegistrationFormProps {
  onComplete?: () => void;
}

export default function RegistrationForm({ onComplete }: RegistrationFormProps) {
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
      // 1. Get a new user ID from Supabase
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: `${username.toLowerCase()}@biovault.local`,
        password: Math.random().toString(36), // Temporary password
      });

      if (authErr || !authData.user) throw new Error(authErr?.message || 'Identity creation failed');

      const optionsResp = await fetch('/api/auth/keys/register/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      });

      const options = await optionsResp.json();
      if (options.error) throw new Error(options.error);

      const attestationResponse = await startRegistration({ optionsJSON: options });

      setStatus('verifying');

      const verifyResp = await fetch('/api/auth/keys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          response: attestationResponse,
        }),
      });

      const verification = await verifyResp.json();
      if (!verification.verified) throw new Error(verification.error || 'Verification failed');

      setStatus('success');
      setTimeout(() => {
        if (onComplete) onComplete();
        else router.push('/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error('[Register] Error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Vault initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 border border-[var(--border-strong)] mx-auto">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="success">
                <CheckCircle2 className="w-8 h-8" />
              </motion.div>
            ) : status === 'error' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="error">
                <AlertCircle className="w-8 h-8" />
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="idle">
                {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Fingerprint className="w-8 h-8" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <h2 className="text-2xl font-outfit font-black tracking-tight uppercase">INITIALIZE VAULT</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-fg)]">Link identity to hardware secure enclave</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-8">
        <div className="space-y-2">
          <label htmlFor="username" className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)] ml-1">
            Vault Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Choose UID..."
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="input-elite"
            disabled={isLoading || status === 'success'}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || status === 'success'}
          className="btn-solid w-full py-5 text-sm tracking-tight"
        >
          {isLoading ? `${status.toUpperCase()}...` : status === 'success' ? 'VAULT READY' : 'CONFIRM IDENTITY'}
        </button>

        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border border-rose-500 text-rose-500 text-[10px] font-bold uppercase tracking-widest"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 p-4 border border-[var(--border)]">
            <div className="text-[10px] font-black uppercase tracking-widest">FIDO2 RSA</div>
            <div className="text-[8px] font-bold uppercase text-[var(--muted-fg)] tracking-tight">Protocol Standard</div>
          </div>
          <div className="flex flex-col gap-1 p-4 border border-[var(--border)]">
            <div className="text-[10px] font-black uppercase tracking-widest">AA 4337</div>
            <div className="text-[8px] font-bold uppercase text-[var(--muted-fg)] tracking-tight">Smart Logic</div>
          </div>
        </div>
      </form>
    </div>
  );
}
