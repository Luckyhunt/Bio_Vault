import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
import { Providers } from "@/components/Providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BioVault | Biometric-Secured Decentralized Wallet",
  description: "Your body is the private key. High-security biometric decentralized wallet built with WebAuthn and Account Abstraction.",
  icons: {
    icon: "/bio_vault.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-inter selection:bg-indigo-500/30 selection:text-indigo-200">
        <LoadingScreen />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
