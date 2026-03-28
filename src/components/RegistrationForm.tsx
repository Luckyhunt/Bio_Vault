'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
      // 1. Generate options from backend
      const optionsResp = await fetch('/api/auth/register/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const options = await optionsResp.json();

      if (options.error) throw new Error(options.error);

      // 2. Trigger native OS biometric prompt
      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      setStatus('verifying');

      // 3. Verify on backend
      const verifyResp = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          attestationResponse,
        }),
      });

      const verification = await verifyResp.json();
      console.log('Backend Verification Object:', verification);

      if (verification.verified) {
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // Use debug_hint in dev if available
        const errorDetail = verification.debug_hint ? ` (${verification.debug_hint})` : '';
        throw new Error((verification.error || 'Verification failed') + errorDetail);
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-4 rounded-2xl bg-blue-500/20 text-blue-400 mb-4"
        >
          {status === 'success' ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          ) : status === 'error' ? (
            <AlertCircle className="w-12 h-12 text-rose-400" />
          ) : (
            <Fingerprint className={`w-12 h-12 ${status === 'scanning' ? 'animate-pulse' : ''}`} />
          )}
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">Initialize Vault</h2>
        <p className="text-white/60">Secure your decentralized identity with biometrics</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-white/80 ml-1">
            Vault Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="e.g. satoshi"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            disabled={isLoading || status === 'success'}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || status === 'success'}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5 text-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <div className="relative flex items-center justify-center gap-3">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : status === 'success' ? (
              'Vault Created!'
            ) : (
              <>
                Confirm Biometrics
                <Fingerprint className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              </>
            )}
          </div>
        </button>

        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-rose-400 text-sm font-medium"
          >
            {errorMsg}
          </motion.p>
        )}
      </form>

      <div className="mt-8 text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold italic">
          Zero-Knowledge Proof Secured
        </p>
      </div>
    </div>
  );
}
