"use client";

import { WalletProvider } from '@/context/WalletContext';
import { ThemeProvider } from '@/components/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </ThemeProvider>
  );
}
