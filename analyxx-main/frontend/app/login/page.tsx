"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { GOOGLE_CLIENT_ID } from "../lib/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect URL from query params (e.g. /login?redirect=/library)
  // Only allow relative paths to prevent open redirect attacks
  const getRedirectUrl = () => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "/";
    // Only allow relative paths — prevent open redirect to external sites
    if (redirect.startsWith("/") && !redirect.startsWith("//")) {
      return redirect;
    }
    return "/";
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      // Check if this user needs onboarding
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
            : "http://localhost:8000/api/v1";
          const profileRes = await fetch(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (!profile.onboarding_completed) {
              window.location.href = "/onboarding";
              return;
            }
          }
        }
      } catch {
        // If profile check fails, proceed with normal redirect
      }

      window.location.href = getRedirectUrl();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.toLowerCase().includes("email not confirmed")) {
        setError("Please check your inbox and click the confirmation link before signing in.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in is not configured");

      // Generate a cryptographic nonce for security
      const rawNonce = crypto.randomUUID();
      // Supabase expects the raw nonce and verifies it against the SHA-256 hash
      // embedded in the ID token, so we send the *hashed* nonce to Google
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(rawNonce)
      );
      const hashedNonce = [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Persist raw nonce + redirect destination for the callback page
      sessionStorage.setItem("google_oauth_nonce", rawNonce);
      sessionStorage.setItem("google_oauth_redirect", getRedirectUrl());

      // Redirect to Google's OAuth2 endpoint (implicit flow with id_token)
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `${window.location.origin}/auth/callback`,
        response_type: "id_token",
        scope: "openid email profile",
        nonce: hashedNonce,
        prompt: "select_account",
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Check if user is already authenticated (e.g. returning from OAuth redirect)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = getRedirectUrl();
      }
    });
  }, []);

  return (
    <main className="lp-root">
      <style>{`
        /* ══════════════════════════════════════════════
           Stitch "Emerald Editorial" Design System
           ══════════════════════════════════════════════ */

        .lp-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;

          /* Ultra-dark base with architectural grid */
          background-color: #050505;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;

          color: #e5e2e1;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── Ambient glow layers ── */
        .lp-glow-top {
          position: fixed;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .lp-glow-bottom {
          position: fixed;
          bottom: -150px;
          left: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Fixed brand header ── */
        .lp-brand-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 28px 20px;
          display: flex;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
        }
        .lp-brand-header a {
          pointer-events: auto;
          text-decoration: none;
          font-family: 'Newsreader', serif;
          font-size: 22px;
          font-weight: 500;
          color: #10b981;
          letter-spacing: -0.01em;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: opacity 200ms;
        }
        .lp-brand-header a:hover { opacity: 0.85; }
        .lp-brand-header img {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          object-fit: cover;
        }

        /* ── Main content ── */
        .lp-main {
          width: 100%;
          max-width: 420px;
          z-index: 1;
        }

        /* ── Welcome heading ── */
        .lp-heading {
          text-align: center;
          margin-bottom: 40px;
        }
        .lp-heading h1 {
          font-family: 'Newsreader', serif;
          font-size: 32px;
          font-weight: 500;
          line-height: 40px;
          color: #e5e2e1;
          margin: 0 0 8px;
        }
        .lp-heading h1 .lp-accent {
          font-style: italic;
          color: #10b981;
          font-family: 'Newsreader', serif;
        }
        .lp-heading p {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 400;
          color: #86948a;
          margin: 0;
          letter-spacing: 0.02em;
        }

        /* ── Glassmorphism card (Stitch elevation layer 2) ── */
        .lp-card {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background-color: rgba(20,20,20,0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 32px;
        }

        /* ── Google button ── */
        .lp-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: none;
          border-radius: 8px;
          color: #e5e2e1;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .lp-google:hover {
          background: rgba(255,255,255,0.08);
          color: #4edea3;
        }
        .lp-google:active { transform: scale(0.98); }
        .lp-google:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Divider ── */
        .lp-divider {
          display: flex;
          align-items: center;
          padding: 28px 0;
        }
        .lp-divider::before,
        .lp-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.05);
        }
        .lp-divider span {
          padding: 0 16px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #86948a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ── Form fields ── */
        .lp-field {
          margin-bottom: 24px;
        }
        .lp-field:last-of-type {
          margin-bottom: 28px;
        }
        .lp-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 0 4px;
        }
        .lp-label {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #86948a;
        }
        .lp-forgot {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #10b981;
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 200ms;
        }
        .lp-forgot:hover { color: #4edea3; }

        .lp-input-wrap {
          position: relative;
        }
        .lp-input {
          width: 100%;
          background: #0e0e0e;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          color: #e5e2e1;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          outline: none;
          transition: all 300ms;
        }
        .lp-input:focus {
          box-shadow: 0 0 0 2px rgba(16,185,129,0.4);
        }
        .lp-input::placeholder {
          color: #353535;
        }
        .lp-input-pw { padding-right: 48px; }

        /* ── Password toggle ── */
        .lp-eye {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #86948a;
          display: flex;
          align-items: center;
          transition: color 200ms;
        }
        .lp-eye:hover { color: #4edea3; }

        /* ── Primary CTA (Stitch: emerald glow layer) ── */
        .lp-submit {
          width: 100%;
          background: #10b981;
          color: #003824;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 0 20px rgba(16,185,129,0.15);
        }
        .lp-submit:hover:not(:disabled) {
          background: #4edea3;
          box-shadow: 0 0 30px rgba(16,185,129,0.25);
        }
        .lp-submit:active:not(:disabled) {
          transform: scale(0.97);
        }
        .lp-submit:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ── Error state ── */
        .lp-error {
          background: #93000a22;
          border: 1px solid rgba(255,180,171,0.18);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #ffb4ab;
          line-height: 1.5;
        }

        /* ── Footer ── */
        .lp-footer {
          text-align: center;
          margin-top: 40px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          color: #86948a;
        }
        .lp-footer a {
          color: #e5e2e1;
          text-decoration: underline;
          text-underline-offset: 4px;
          text-decoration-color: rgba(229,226,225,0.3);
          transition: all 200ms;
        }
        .lp-footer a:hover {
          color: #10b981;
          text-decoration-color: #10b981;
        }

        /* ── Bottom legal bar ── */
        .lp-legal {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
          z-index: 10;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #86948a;
          letter-spacing: 0.05em;
        }
        .lp-legal-links {
          display: flex;
          gap: 24px;
        }
        .lp-legal-links a {
          color: #86948a;
          text-decoration: none;
          transition: color 200ms;
        }
        .lp-legal-links a:hover { color: #c9c6c5; }

        /* ── Entrance animation ── */
        @keyframes lp-fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-animate {
          animation: lp-fadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .lp-animate-delay { animation-delay: 0.1s; }
        .lp-animate-delay-2 { animation-delay: 0.2s; }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .lp-root { padding: 16px; padding-top: 80px; }
          .lp-card { padding: 24px 20px; }
          .lp-heading h1 { font-size: 28px; line-height: 36px; }
          .lp-brand-header { padding: 20px 16px; }
          .lp-legal {
            position: relative;
            margin-top: 40px;
            border-top: none;
            padding: 0;
          }
        }
        @media (min-width: 768px) {
          .lp-legal {
            flex-direction: row;
            justify-content: space-between;
            padding: 28px 64px;
          }
        }
      `}</style>

      {/* Ambient glow effects */}
      <div className="lp-glow-top" />
      <div className="lp-glow-bottom" />

      {/* Fixed brand header */}
      <header className="lp-brand-header">
        <a href="/">
          <img src="/logo.png" alt="ANALYXX" className="theme-logo" />
          ANALYXX AI
        </a>
      </header>

      {/* Main login content */}
      <div className="lp-main">
        {/* Heading */}
        <div className="lp-heading lp-animate">
          <h1>
            Welcome <span className="lp-accent">back</span>
          </h1>
          <p>Enter your credentials to access precision intelligence.</p>
        </div>

        {/* Glassmorphism card */}
        <div className="lp-card lp-animate lp-animate-delay">
          {/* Error */}
          {error && <div className="lp-error">{error}</div>}

          {/* Google SSO */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="lp-google"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{loading ? "Connecting..." : "Sign in with Google"}</span>
          </button>

          {/* Divider */}
          <div className="lp-divider"><span>or</span></div>

          {/* Email field */}
          <div className="lp-field">
            <div className="lp-label-row">
              <label className="lp-label" htmlFor="lp-email">Email</label>
            </div>
            <div className="lp-input-wrap">
              <input
                id="lp-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lp-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="lp-field">
            <div className="lp-label-row">
              <label className="lp-label" htmlFor="lp-password">Password</label>
              <a href="/forgot-password" className="lp-forgot">Forgot your password?</a>
            </div>
            <div className="lp-input-wrap">
              <input
                id="lp-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="lp-input lp-input-pw"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lp-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="lp-submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        {/* Sign up link */}
        <div className="lp-footer lp-animate lp-animate-delay-2">
          Don&apos;t have an account? <a href="/register">Sign up</a>
        </div>
      </div>

      {/* Legal footer */}
      <footer className="lp-legal">
        <span>© 2026 ANALYXX AI. Precision Intelligence.</span>
        <div className="lp-legal-links">
          <a href="/about">About</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </footer>
    </main>
  );
}