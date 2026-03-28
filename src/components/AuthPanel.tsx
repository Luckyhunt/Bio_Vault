'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import RegistrationForm from './RegistrationForm';

export default function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const optionsResp = await fetch('/api/auth/login/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const options = await optionsResp.json();

      if (options.error) throw new Error(options.error);

      const authenticationResponse = await startAuthentication({ optionsJSON: options });

      const verifyResp = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          authenticationResponse,
        }),
      });

      const verification = await verifyResp.json();
      console.log('[Login] Verify response:', verification);

      if (verification.verified && verification.redirectUrl) {
        window.location.href = verification.redirectUrl;
      } else {
        const hint = verification.debug_hint ? ` [${verification.debug_hint}]` : '';
        throw new Error((verification.error || 'Login failed') + hint);
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toggle */}
      <div className="flex bg-white/5 p-1 rounded-2xl mb-6 border border-white/10 max-w-[280px] mx-auto">
        <button
          onClick={() => setMode('register')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${
            mode === 'register' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Join
        </button>
        <button
          onClick={() => setMode('login')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${
            mode === 'login' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Login
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'register' ? (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <RegistrationForm />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md mx-auto p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4">
                <LogIn className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Access Vault</h2>
              <p className="text-white/60">Welcome back, biometric identity verified</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 ml-1">Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-5 text-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="flex items-center justify-center gap-3">
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      Verify Identity
                      <Fingerprint className="w-6 h-6" />
                    </>
                  )}
                </div>
              </button>

              {errorMsg && (
                <div className="flex items-center gap-2 justify-center text-rose-400 text-sm font-medium bg-rose-400/10 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
