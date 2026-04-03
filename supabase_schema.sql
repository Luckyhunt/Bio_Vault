-- 🛡️ BioVault Supabase Database Schema (Elite Architecture)
-- Run this in the Supabase SQL Editor. It will CREATE missing tables, 
-- safely update existing tables, drop rogue legacy triggers, 
-- establish strict RLS, and deploy advanced RPCs to prevent replay attacks.

-- ==========================================
-- 0. PURGE ROGUE LEGACY TRIGGERS
-- ==========================================
-- A common 500 POST /signup error occurs because old tutorials leave triggers that
-- crash our streamlined architecture. We proactively remove them.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
-- Required for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CREATE TABLES (IF THEY DO NOT EXIST)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  wallet_address TEXT UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.passkeys (
  id TEXT PRIMARY KEY, 
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL, 
  counter BIGINT NOT NULL DEFAULT 0,
  credential_device_type TEXT NOT NULL DEFAULT 'singleDevice',
  transports JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'login')),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. EDGE CASES: ADD MISSING COLUMNS
-- ==========================================
-- If you created tables previously but missed critical new columns,
-- these queries will safely inject them without causing constraint errors.

DO $$
BEGIN
    -- Upgrading profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='wallet_address') THEN
        ALTER TABLE public.profiles ADD COLUMN wallet_address TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    END IF;

    -- Upgrading passkeys
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='passkeys' AND column_name='transports') THEN
        ALTER TABLE public.passkeys ADD COLUMN transports JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='passkeys' AND column_name='credential_device_type') THEN
        ALTER TABLE public.passkeys ADD COLUMN credential_device_type TEXT NOT NULL DEFAULT 'singleDevice';
    END IF;

    -- Upgrading challenges
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='challenges' AND column_name='expires_at') THEN
        ALTER TABLE public.challenges ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '5 minutes';
    END IF;
END $$;

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable strict Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if establishing a baseline
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own passkeys" ON public.passkeys;

-- Create Unbreakable RLS Policies
-- Users can only modify or read their own data via matching their Auth Session UUID
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own passkeys" ON public.passkeys FOR SELECT USING (auth.uid() = user_id);

-- Note: Challenges are completely black-boxed from client environments. 
-- Only the Edge Server (Service Role Key) can manipulate them to prevent attacks.

-- ==========================================
-- 5. ANTI-REPLAY ATTACK STORED PROCEDURE (RPC)
-- ==========================================
-- This secures concurrent and replay attacks by atomically verifying a challenge
-- is active and unused, marking it used, or rejecting the transaction instantly.

CREATE OR REPLACE FUNCTION public.consume_challenge(p_challenge TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_used BOOLEAN;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Select the challenge FOR UPDATE (locks row to prevent concurrent race conditions)
    SELECT id, used, expires_at 
    INTO v_id, v_used, v_expires_at 
    FROM public.challenges 
    WHERE challenge = p_challenge
    FOR UPDATE;

    -- If challenge does not exist, is already used, or is expired -> REJECT
    IF v_id IS NULL OR v_used = TRUE OR NOW() > v_expires_at THEN
        RETURN FALSE;
    END IF;

    -- Atomically consume
    UPDATE public.challenges SET used = TRUE WHERE id = v_id;
    RETURN TRUE;
END;
$$;

-- ==========================================
-- 6. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON public.passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_fast_lookup ON public.challenges(challenge, used, expires_at);
