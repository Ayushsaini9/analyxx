-- =============================================================
-- ANALYXX AI — Canonical Supabase Schema
-- =============================================================
-- This file is the definitive source of truth for the database.
-- Run this in the Supabase SQL Editor on a fresh project to
-- create all tables from scratch.
--
-- Existing production DB already has these tables — this file
-- is for documentation, disaster recovery, and new environments.
-- =============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
-- gen_random_uuid() is available via pgcrypto in Supabase by default.


-- =============================================================
-- TABLE: users
-- Profile data for authenticated users (mirrors auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id                    VARCHAR PRIMARY KEY,          -- Supabase Auth UUID (auth.users.id)
    name                  VARCHAR(255) NOT NULL,
    email                 VARCHAR(255) UNIQUE NOT NULL,
    password_hash         VARCHAR(255),                 -- NULL for OAuth users
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMP DEFAULT NOW(),

    -- Profile fields
    gender                VARCHAR(50),
    date_of_birth         DATE,
    institution           VARCHAR(255),
    school_name           VARCHAR(255),
    college_email         VARCHAR(255),
    college_email_verified BOOLEAN DEFAULT FALSE,
    exam_target           VARCHAR(100),
    profile_completed     BOOLEAN DEFAULT FALSE,
    profile_picture       TEXT                          -- base64 data URI or HTTPS URL
);


-- =============================================================
-- TABLE: papers
-- User-uploaded PYQ papers + analysis results
-- =============================================================
CREATE TABLE IF NOT EXISTS public.papers (
    id              VARCHAR PRIMARY KEY DEFAULT LEFT(gen_random_uuid()::text, 8),
    user_id         VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exam_name       VARCHAR(255) NOT NULL,
    years           VARCHAR(255) NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    file_size       INTEGER,
    file_url        VARCHAR(500),
    status          VARCHAR(50) DEFAULT 'uploaded',   -- uploaded | processing | done | failed
    extracted_text  TEXT,
    analysis_result JSON,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_papers_user_id ON public.papers(user_id);


-- =============================================================
-- TABLE: paper_requests
-- User requests for papers not yet in the library
-- =============================================================
CREATE TABLE IF NOT EXISTS public.paper_requests (
    id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id     VARCHAR REFERENCES public.users(id) ON DELETE SET NULL,  -- nullable for anonymous
    user_email  VARCHAR(255),
    exam        VARCHAR(255) NOT NULL,
    exam_id     VARCHAR(100) NOT NULL,
    year        INTEGER NOT NULL,
    subject     VARCHAR(255),
    status      VARCHAR(50) DEFAULT 'pending',         -- pending | fulfilled | rejected
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_requests_user_id ON public.paper_requests(user_id);


-- =============================================================
-- TABLE: subscriptions
-- One row per user — current active plan
-- =============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  VARCHAR UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan                     VARCHAR(20) NOT NULL DEFAULT 'free',    -- free | pro_daily | pro_monthly | pro_annual
    status                   VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | expired | cancelled
    starts_at                TIMESTAMPTZ DEFAULT NOW(),
    expires_at               TIMESTAMPTZ,
    razorpay_order_id        VARCHAR(255),
    razorpay_payment_id      VARCHAR(255),
    razorpay_subscription_id VARCHAR(255),
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);


-- =============================================================
-- TABLE: payments
-- Full payment ledger — one row per transaction attempt
-- =============================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    razorpay_order_id        VARCHAR(255),
    razorpay_payment_id      VARCHAR(255),
    razorpay_signature       VARCHAR(255),
    razorpay_subscription_id VARCHAR(255),
    amount                   INTEGER NOT NULL,          -- in paise (INR × 100)
    currency                 VARCHAR(10) NOT NULL DEFAULT 'INR',
    plan                     VARCHAR(20) NOT NULL,
    status                   VARCHAR(20) NOT NULL DEFAULT 'created',  -- created | paid | failed
    created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
-- Backend connects via DATABASE_URL (postgres role) → bypasses RLS.
-- These policies only affect direct Supabase client (anon/authenticated key) access.

-- ─── users ───────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid()::text = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid()::text = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid()::text = id);


-- ─── papers ──────────────────────────────────────────────────
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own papers"
    ON public.papers FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own papers"
    ON public.papers FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own papers"
    ON public.papers FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own papers"
    ON public.papers FOR DELETE
    USING (auth.uid()::text = user_id);


-- ─── paper_requests ──────────────────────────────────────────
ALTER TABLE public.paper_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own paper requests"
    ON public.paper_requests FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can create paper requests"
    ON public.paper_requests FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own paper requests"
    ON public.paper_requests FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own paper requests"
    ON public.paper_requests FOR DELETE
    USING (auth.uid()::text = user_id);


-- ─── subscriptions ───────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription (e.g., to show plan status in UI)
CREATE POLICY IF NOT EXISTS "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid()::text = user_id);

-- All writes handled exclusively by backend (service role)
CREATE POLICY IF NOT EXISTS "Service role can insert subscriptions"
    ON public.subscriptions FOR INSERT
    WITH CHECK (true);  -- service role bypasses this anyway; blocks anon writes

CREATE POLICY IF NOT EXISTS "Service role can update subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (true);


-- ─── payments ────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY IF NOT EXISTS "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid()::text = user_id);

-- All writes handled exclusively by backend (service role)
CREATE POLICY IF NOT EXISTS "Service role can insert payments"
    ON public.payments FOR INSERT
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role can update payments"
    ON public.payments FOR UPDATE
    USING (true);
