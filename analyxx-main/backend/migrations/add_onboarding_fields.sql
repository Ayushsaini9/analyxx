-- Add onboarding-related fields to users table
-- Run in Supabase SQL Editor or via migration tool

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscribed_to_emails BOOLEAN DEFAULT FALSE;
