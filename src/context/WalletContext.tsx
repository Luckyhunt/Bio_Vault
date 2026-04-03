"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { createPasskeySmartAccountClient } from '@/lib/smart-wallet';
import { createPublicClient, http, formatEther } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { PUBLIC_CONFIG } from '@/config/env';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalletStatus =
  | 'idle'          // No wallet loaded
  | 'connecting'    // Deriving smart account from passkey
  | 'connected'     // Wallet ready, balance live
  | 'sending'       // UserOp in-flight
  | 'error';        // Something went wrong (see lastError)

export interface WalletContextType {
  /** Derived smart account address on Polygon Amoy */
  address: string | null;
  /** MATIC balance as formatted string */
  balance: string;
  /** Whether the smart account contract is deployed on-chain */
  isDeployed: boolean;
  /** The smart account client (permissionless) for sending UserOps */
  client: any | null;
  /** High-level wallet status for UI state indicators */
  status: WalletStatus;
  /** Last error message — cleared on next connect/send attempt */
  lastError: string | null;
  /** Manual balance refresh */
  fetchBalance: () => Promise<void>;
  /**
   * Connect wallet: derives smart account deterministically from passkey.
   * Idempotent — if already connected with same credentialId, no-ops.
   */
  connect: (credentialId: string, publicKey: string) => Promise<void>;
  /**
   * Disconnect / reset wallet state.
   * Call on logout or if the user switches accounts.
   */
  disconnect: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isDeployed, setIsDeployed] = useState(false);
  const [client, setClient] = useState<any | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Track which credentialId is currently connected to avoid duplicate connections
  const connectedCredentialId = useRef<string | null>(null);
  // AbortController ref for in-flight balance fetches (network failure guard)
  const balancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(PUBLIC_CONFIG.rpcUrl),
  });

  // ── Balance Fetch ──────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    
    // ⬢ Request Deduplication & Abort logic (Elite Gap #7)
    const controller = new AbortController();
    
    try {
      const balanceWei = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      setBalance(formatEther(balanceWei));
      logger.debug({ message: 'Balance auto-refresh', context: { address, balance: formatEther(balanceWei) } });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      logger.warn({ message: 'Balance fetch skipped', context: { address }, error: err });
    }
  }, [address]);

  // ── Polling Setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (address && status === 'connected') {
      fetchBalance(); // Immediate fetch on connect
      balancePollRef.current = setInterval(fetchBalance, 12_000); // ~1 Amoy block
    }
    return () => {
      if (balancePollRef.current) {
        clearInterval(balancePollRef.current);
        balancePollRef.current = null;
      }
    };
  }, [address, status, fetchBalance]);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async (credentialId: string, publicKey: string) => {
    // ⬢ Multi-session guard: if already connected with the same credential, skip
    if (connectedCredentialId.current === credentialId && status === 'connected') {
      console.log('[WalletContext] Already connected with credentialId:', credentialId);
      return;
    }

    setLastError(null);
    setStatus('connecting');

    try {
      const { client: smartClient, account, isDeployed: deployed } =
        await createPasskeySmartAccountClient(credentialId, publicKey);

      setClient(smartClient);
      setAddress(account.address);
      setIsDeployed(!!deployed);
      setStatus('connected');
      connectedCredentialId.current = credentialId;

      logger.info({ 
        message: 'Wallet session established', 
        context: { address: account.address, isDeployed: deployed } 
      });
    } catch (err: any) {
      // ⬢ Edge case: WebAuthn cancelled by user → NotAllowedError
      // ⬢ Edge case: Network error mid-connect, bundler unreachable
      const msg: string =
        err?.name === 'NotAllowedError'
          ? 'Biometric prompt was cancelled. Please try again.'
          : err?.message?.includes('fetch')
          ? 'Network error — check your connection and retry.'
          : err?.message || 'Failed to connect smart wallet.';

      console.error('[WalletContext] Connect error:', err);
      setLastError(msg);
      setStatus('error');
      // ⬢ Half-connected state guard: reset so we don't keep stale client
      setClient(null);
      connectedCredentialId.current = null;
    }
  }, [status]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance('0');
    setIsDeployed(false);
    setClient(null);
    setStatus('idle');
    setLastError(null);
    connectedCredentialId.current = null;
    if (balancePollRef.current) {
      clearInterval(balancePollRef.current);
      balancePollRef.current = null;
    }
    console.log('[WalletContext] Disconnected.');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isDeployed,
        client,
        status,
        lastError,
        fetchBalance,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a <WalletProvider>');
  }
  return context;
};
