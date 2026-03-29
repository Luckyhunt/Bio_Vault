'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Fingerprint, Trash2, Smartphone, Monitor, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function PasskeyModal({ isOpen, onClose, user }: PasskeyModalProps) {
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPasskeys();
    }
  }, [isOpen]);

  const fetchPasskeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('passkeys')
      .select('*')
      .eq('user_id', user.id);
    
    if (data) setPasskeys(data);
    setLoading(false);
  };

  const deletePasskey = async (id: string) => {
    if (!confirm('Are you sure? Once deleted, this device will no longer have access to your BioVault.')) return;
    
    const { error } = await supabase.from('passkeys').delete().eq('id', id);
    if (error) {
      alert('Failed to delete passkey: ' + error.message);
    } else {
      fetchPasskeys();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                Manage Passkeys
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-white/20">
                  <Fingerprint className="w-12 h-12 animate-pulse mb-4" />
                  <p className="text-sm font-bold animate-pulse">Scanning Vault...</p>
                </div>
              ) : passkeys.length > 0 ? (
                passkeys.map((pk) => (
                  <div key={pk.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10">
                        {pk.device_type === 'single_device' ? <Smartphone className="w-5 h-5 text-indigo-400" /> : <Monitor className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white/80">Device Identifier</span>
                        <code className="text-[10px] text-white/40 font-mono tracking-tight">{pk.id.slice(0, 16)}...</code>
                      </div>
                    </div>
                    <button 
                      onClick={() => deletePasskey(pk.id)}
                      className="p-3 rounded-2xl bg-red-400/5 hover:bg-red-400/20 text-red-400/40 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-white/40 italic py-8">No passkeys found in the vault.</p>
              )}

              <div className="mt-8 p-5 rounded-3xl bg-orange-500/5 border border-orange-500/10 flex gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0" />
                <p className="text-[11px] text-orange-400/80 font-medium leading-[1.6]">
                  Your Smart Wallet address is derived from your first registered passkey. Deleting all passkeys will result in a total loss of access to your decentralized funds.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
