# 🛡️ BioVault: Elite Biometric-Native Smart Wallet

BioVault is a production-grade Web3 authentication platform and smart wallet that leverages hardware-bound biometrics (FaceID, TouchID, Windows Hello) to create a seamless, seedless, and non-custodial blockchain experience.

## 🎯 Project Overview

BioVault aims to eliminate the biggest hurdle in Web3: **Key Management**. By converting the secure enclave of your device into a cryptographic signer, BioVault allows users to manage a decentralized smart wallet with the same ease as unlocking their phone.

- **Non-Custodial**: Keys never leave your device's hardware.
- **Gasless**: Powered by ERC-4337 Account Abstraction and Pimlico sponsorship.
- **Enterprise Ready**: Full environment validation and Edge-runtime security.

---

## 💻 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion.
- **Logic & AA**: [Permissionless.js](https://docs.pimlico.io/permissionless), [Viem](https://viem.sh), [SimpleWebAuthn](https://simplewebauthn.dev).
- **Infrastructure**: [Pimlico](https://pimlico.io) (Bundler & Paymaster).
- **Backend / Database**: [Supabase](https://supabase.com) (PostgreSQL + RLS + Auth).
- **Blockchain**: Polygon Amoy (Testnet).

---

## ✨ Key Features

- 🔑 **Passkey Authentication**: FIDO2 compliant registration and login.
- 💳 **Smart Wallet**: Deterministic ERC-4337 smart account derivation.
- ⛽ **Gasless Experience**: Sponsored transactions via Pimlico Paymaster.
- 📊 **Metric Dashboard**: Real-time balance tracking and transaction history.
- 🖤 **Cyber-Noir UI**: High-fidelity, monochromatic, responsive design.
- 🔒 **Elite Config Layer**: Zod-validated environment management.

---

## 📁 Project Structure

```bash
/src
  ├── /app           # Routes, API endpoints, and layouts.
  ├── /components    # Reusable UI components (Dashboard, Metrics, etc).
  ├── /config        # Centralized & validated config layer (Zod).
  ├── /context       # Global Wallet & Auth state providers.
  ├── /lib           # Core logic (Smart Wallet, WebAuthn utils, Encoding).
  └── /middleware.ts # Security headers & Edge-runtime CSP.
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Luckyhunt/Bio_Vault.git
cd Bio_Vault
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key

# --- Network & RP ---
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_ORIGIN=http://localhost:3000
NEXT_PUBLIC_RP_NAME=BioVault

# --- Account Abstraction (Pimlico) ---
NEXT_PUBLIC_PIMLICO_URL=https://api.pimlico.io
NEXT_PUBLIC_BUNDLER_RPC_URL=https://api.pimlico.io/v2/80002/rpc?apikey=your-api-key
NEXT_PUBLIC_ENTRYPOINT=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

# --- Explorer ---
NEXT_PUBLIC_EXPLORER_URL=https://amoy.polygonscan.com
NEXT_PUBLIC_EXPLORER_TX_URL=https://amoy.polygonscan.com/tx/
```

---

## 🔐 Required Services Setup

### Supabase
1. Create a new project at [database.new](https://database.new).
2. Run the provided SQL setup script (see `supabase_schema.sql` if available, or initialize `profiles`, `passkeys`, and `challenges` tables).
3. Copy the **Project URL**, **Anon Key**, and **Service Role Key** to your `.env.local`.

### Pimlico
1. Sign up at [dashboard.pimlico.io](https://dashboard.pimlico.io).
2. Generate an API Key for the **Polygon Amoy** network.
3. Use the supplied Bundler RPC URL in your config.

### Polygon Amoy
1. Obtain testnet MATIC from a [faucet](https://faucet.polygon.technology/).
2. Ensure you use the official Amoy RPC provided by Alchemy, Infura, or the public aggregator.

---

## 🚀 Running the Project

```bash
# Develop
npm run dev

# Build
npm run build
```

---

## 🛡️ Security Notes

- **Credential Privacy**: Private keys never leave the hardware enclave. Only public keys (COSE/PKCS) are stored in the database.
- **Environment Validation**: The `src/config/env.ts` layer uses Zod to prevent the application from starting if a crucial variable is missing.
- **Security Headers**: Middleware enforces strict CSP (Content Security Policy) and HSTS headers.
- **Server Separation**: Variables without the `NEXT_PUBLIC_` prefix are strictly hidden from the browser.

---

## 🧪 Testing

### Authentication
- Register a new user with a unique username.
- Perform a biometric "Handshake" to initialize the account.
- Log out and log back in using only biometrics.

### Transactions
- View your deterministic smart account address on the dashboard.
- Send a test transaction (the account is deployed counterfactually on the first transaction).
- Verify the transaction hash on the Polygon Amoy explorer.

---

## 📦 Deployment

1. **Vercel**: Connect your GitHub repository to Vercel.
2. **Environment Variables**: Use the Vercel Dashboard to set all the variables listed in your `.env.local`.
3. **RP_ID & ORIGIN**: Update `NEXT_PUBLIC_RP_ID` and `NEXT_PUBLIC_ORIGIN` to match your production domain.

---

*Built with ❤️ by the BioVault Team*
