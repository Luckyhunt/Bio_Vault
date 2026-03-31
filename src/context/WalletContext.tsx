"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createPasskeySmartAccountClient } from '@/lib/smart-wallet';
import { createPublicClient, http, formatEther } from 'viem';
import { polygonAmoy } from 'viem/chains';

interface WalletContextType {
  address: string | null;
  balance: string;
  isConnecting: boolean;
  isDeployed: boolean;
  client: any | null;
  fetchBalance: () => Promise<void>;
  connect: (credentialId: string, publicKey: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [client, setClient] = useState<any | null>(null);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http('https://rpc-amoy.polygon.technology'),
  });

  const fetchBalance = async () => {
    if (!address) return;
    try {
      const balanceWei = await publicClient.getBalance({ address: address as `0x${string}` });
      setBalance(formatEther(balanceWei));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const connect = async (credentialId: string, publicKey: string) => {
    setIsConnecting(true);
    try {
      const { client, account, isDeployed } = await createPasskeySmartAccountClient(
        credentialId,
        publicKey
      );
      
      setClient(client);
      setAddress(account.address);
      setIsDeployed(!!isDeployed);
    } catch (error) {
      console.error('Error connecting smart account:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchBalance();
      // Poll balance every 10 seconds
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [address]);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isConnecting,
        isDeployed,
        client,
        fetchBalance,
        connect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
