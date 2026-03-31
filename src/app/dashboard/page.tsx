'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Dashboard from '@/components/Dashboard';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initSession = async () => {
      try {
        // ⬢ Edge case: Supabase magic link drops tokens in the URL hash.
        // We must let the Supabase client pick them up by calling getSession()
        // BEFORE stripping the hash — otherwise the session is never exchanged.
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr) {
          console.warn('[Dashboard] Session error:', sessionErr.message);
          // Stale refresh token — clear storage and redirect to login
          if (
            sessionErr.message.includes('Refresh Token Not Found') ||
            sessionErr.message.includes('Invalid Refresh Token')
          ) {
            await supabase.auth.signOut();
            router.push('/?error=session_expired');
            return;
          }
        }

        // After getSession() the tokens are exchanged; now clean the URL
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        const session = sessionData?.session;
        if (!session?.user) {
          router.push('/');
          return;
        }

        setUser(session.user);
      } catch (err: any) {
        console.error('[Dashboard] Unexpected session init error:', err);
        setSessionError('Session initialization failed. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes (token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && !loading)) {
        router.push('/');
      }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-white/40 text-sm">Loading your vault…</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white">
        <ShieldAlert className="w-12 h-12 text-rose-400" />
        <p className="text-rose-400 font-bold">{sessionError}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-sm font-bold transition-all"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <Dashboard user={user} />
    </main>
  );
}
