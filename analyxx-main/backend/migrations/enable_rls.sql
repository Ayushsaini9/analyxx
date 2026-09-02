-- =============================================================
-- Enable Row Level Security (RLS) on all public tables
-- =============================================================
-- Your backend uses SQLAlchemy with a direct Postgres connection
-- and the WhatsApp bot uses SUPABASE_SERVICE_KEY — both bypass
-- RLS by default, so this change is safe and non-breaking.
--
-- RLS protects against unauthorised access through Supabase's
-- auto-generated PostgREST API (the anon / authenticated keys).
-- =============================================================

-- ─── 1. papers ─────────────────────────────────────────────────
-- Users should only access their own uploaded papers.
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own papers
CREATE POLICY "Users can view own papers"
  ON public.papers FOR SELECT
  USING (auth.uid()::text = user_id);

-- Authenticated users can insert their own papers
CREATE POLICY "Users can insert own papers"
  ON public.papers FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Authenticated users can update their own papers
CREATE POLICY "Users can update own papers"
  ON public.papers FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Authenticated users can delete their own papers
CREATE POLICY "Users can delete own papers"
  ON public.papers FOR DELETE
  USING (auth.uid()::text = user_id);


-- ─── 2. users ──────────────────────────────────────────────────
-- Users should only read their own profile. All writes go
-- through the backend (service role / direct Postgres).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id);


-- ─── 3. paper_requests ─────────────────────────────────────────
-- Users can create requests and view their own requests.
-- Admin access is handled by the backend (service role).
ALTER TABLE public.paper_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their own paper requests
CREATE POLICY "Users can view own requests"
  ON public.paper_requests FOR SELECT
  USING (auth.uid()::text = user_id);

-- Authenticated users can create paper requests
CREATE POLICY "Users can create requests"
  ON public.paper_requests FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
