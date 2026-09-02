-- Migration: Add cookie_preferences column to users table
-- This stores GDPR/IT Act compliant cookie consent preferences as JSON.
-- Safe to run multiple times (IF NOT EXISTS equivalent via DO block).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'cookie_preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN cookie_preferences JSONB DEFAULT NULL;
        COMMENT ON COLUMN users.cookie_preferences IS 'User cookie consent preferences: {essential, analytics, marketing, timestamp}';
    END IF;
END $$;
