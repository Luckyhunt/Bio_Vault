'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Fingerprint, Trash2, Smartphone, Monitor, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
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
    const { data } = await supabase
      .from('passkeys')
      .select('*')
      .eq('user_id', user.id);
    
    if (data) setPasskeys(data);
    setLoading(false);
  };

  const deletePasskey = async (id: string, isPrimary: boolean) => {
    if (passkeys.length <= 1) {
      alert("CRITICAL GUARDRAIL: You cannot delete your last passkey. Access to your BioVault depends on at least one registered biometric device.");
      return;
    }

    const warning = isPrimary 
      ? 'WARNING: This is your PRIMARY device used for initial wallet derivation. Deleting it may complicate recovery on new devices. Proceed?' 
      : 'Remove this biometric credential from your vault?';
      
    if (!confirm(warning)) return;
    
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
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden pointer-events-auto"
            >
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[90px] rounded-full -mr-20 -mt-20" />
              
              {/* Header */}
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-outfit font-black tracking-tight flex items-center gap-3">
                    Vault Enclave
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Registered Biometric Devices</p>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl transition-all border border-white/5"
                  disabled={loading}
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Querying Hardware Keys...</p>
                  </div>
                ) : passkeys.length > 0 ? (
                  <div className="space-y-3">
                    {passkeys.map((pk, idx) => {
                      const isPrimary = idx === 0;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={pk.id} 
                          className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all duration-300"
                        >
                          <div className="flex items-center gap-5">
                            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                              {pk.credential_device_type === 'singleDevice' ? (
                                <Smartphone className="w-6 h-6" />
                              ) : (
                                <Monitor className="w-6 h-6" />
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-white/90 uppercase tracking-widest"> 
                                  Credential {idx + 1} 
                                </span>
                                {isPrimary && (
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-[0.15em] border border-emerald-500/20"> 
                                    Master Root 
                                  </span>
                                )}
                              </div>
                              <code className="text-[10px] text-white/20 font-mono tracking-tight bg-white/[0.03] px-2 py-0.5 rounded-md">
                                {pk.id.slice(0, 16)}...
                              </code>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => deletePasskey(pk.id, isPrimary)}
                            className="p-3 rounded-2xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500/40 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                            title="Revoke Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/20">
                    <Fingerprint className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Active Credentials</p>
                  </div>
                )}

                {/* Warning Footer */}
                <div className="mt-8 p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex gap-5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 h-fit">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Security Advisory</div>
                    <p className="text-[11px] text-white/40 font-medium leading-relaxed">
                      Your identity is cryptographically tied to these credentials. 
                      <span className="text-white/60"> Losing all registered devices will result in permanent loss of funds.</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center">
                <button className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 hover:text-indigo-400/40 transition-colors">
                  Protocol Cryptography Manifest
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
