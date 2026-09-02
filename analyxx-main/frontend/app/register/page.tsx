"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { GOOGLE_CLIENT_ID } from "../lib/config";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      if (authError) throw authError;

      // Supabase returns an empty identities array when the email is already registered
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("An account with this email already exists. Please sign in instead.");
        setLoading(false);
        return;
      }

      if (data.session) {
        // Auto-confirmed — user is logged in, start onboarding
        window.location.href = "/onboarding";
      } else {
        // Email confirmation required — show success message
        setConfirmationSent(true);
      }
    } catch (err: any) {
      setError(err.message);
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
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(rawNonce)
      );
      const hashedNonce = [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Persist raw nonce + redirect destination for the callback page
      sessionStorage.setItem("google_oauth_nonce", rawNonce);
      sessionStorage.setItem("google_oauth_redirect", "/");

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

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/";
    });
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      <style>{`
        .font-serif { font-family: 'Newsreader', serif; }
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        @keyframes morph {
          0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
          50%      { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .input-field {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
          padding: 14px 18px; color: #EBEBEB; font-size: 15px;
          font-family: 'Inter', sans-serif; outline: none; transition: border-color 300ms;
        }
        .input-field:focus { border-color: rgba(var(--primary-rgb),0.4); }
        .input-field::placeholder { color: rgba(var(--text-rgb),0.25); }
        .submit-btn {
          width: 100%; background: var(--primary); color: white; border: none;
          border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          font-family: 'Inter', sans-serif;
        }
        .submit-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .google-btn {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 14px;
          font-size: 15px;
          font-weight: 500;
          color: #EBEBEB;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-family: 'Inter', sans-serif;
          transition: all 300ms cubic-bezier(0.16,1,0.3,1);
          position: relative;
          overflow: hidden;
        }
        .google-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(var(--primary-rgb),0.0) 0%, rgba(var(--primary-rgb),0.05) 100%);
          opacity: 0;
          transition: opacity 300ms;
        }
        .google-btn:hover::before { opacity: 1; }
        .google-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(var(--primary-rgb),0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(var(--primary-rgb),0.1);
        }
        .google-btn:active { transform: translateY(0); }
        .google-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .divider {
          display: flex; align-items: center; gap: 16px;
          margin: 24px 0; color: rgba(var(--text-rgb),0.2); font-size: 12px;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px;
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", background: "rgba(var(--primary-rgb),0.07)", filter: "blur(100px)", animation: "morph 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-100px", left: "-100px", width: "350px", height: "350px", background: "rgba(var(--primary-rgb),0.05)", filter: "blur(100px)", animation: "morph 14s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Hidden Google rendered button */}
      <div className="fade-up" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover" }} />
              <span className="font-serif" style={{ fontSize: "22px", fontWeight: 300, color: "var(--text)" }}>
                ANALYXX <em style={{ color: "var(--primary)" }}>AI</em>
              </span>
            </div>
          </a>
          <h1 className="font-serif auth-heading" style={{ fontSize: "36px", fontWeight: 300, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: "8px" }}>
            Start <em style={{ color: "var(--primary)" }}>predicting.</em>
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", fontWeight: 300 }}>
            Create your free account — no credit card needed.
          </p>
        </div>

        <div className="auth-card" style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "40px" }}>
          {confirmationSent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
              <h2 className="font-serif" style={{ fontSize: "24px", fontWeight: 400, color: "var(--text)", marginBottom: "12px" }}>
                Check your email
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.5)", lineHeight: "1.6", marginBottom: "24px" }}>
                We've sent a confirmation link to <strong style={{ color: "var(--primary)" }}>{email}</strong>.<br />
                Click the link in the email to activate your account, then come back and sign in.
              </p>
              <a href="/login" className="submit-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Go to Sign In →
              </a>
              <p style={{ fontSize: "12px", color: "rgba(var(--text-rgb),0.3)", marginTop: "16px" }}>
                Didn't receive the email? Check your spam folder.
              </p>
            </div>
          ) : (
          <>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "14px 16px", marginBottom: "24px", fontSize: "14px", color: "#fca5a5" }}>
              {error.includes("already exists") ? (
                <span>
                  An account with this email already exists.{" "}
                  <a href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline" }}>Sign in instead →</a>
                </span>
              ) : (
                error
              )}
            </div>
          )}

          {[
            { label: "Full Name", type: "text", val: name, set: setName, placeholder: "John Doe" },
            { label: "Email Address", type: "email", val: email, set: setEmail, placeholder: "you@example.com" },
            { label: "Password", type: "password", val: password, set: setPassword, placeholder: "Min. 8 characters" },
          ].map((field) => (
            <div key={field.label} style={{ marginBottom: "20px" }}>
              <label className="font-grotesk" style={{ display: "block", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(var(--text-rgb),0.35)", marginBottom: "10px" }}>
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.val}
                onChange={(e) => field.set(e.target.value)}
                className="input-field"
              />
            </div>
          ))}

          <div style={{ marginBottom: "28px" }} />

          <button onClick={handleRegister} disabled={loading || !name || !email || !password} className="submit-btn">
            {loading ? "Creating account..." : "Create Free Account →"}
          </button>

          <div className="divider">or</div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="google-btn"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ position: "relative" }}>
              {loading ? "Connecting..." : "Continue with Google"}
            </span>
          </button>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <span style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.35)" }}>Already have an account? </span>
            <a href="/login" style={{ fontSize: "14px", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>Sign in</a>
          </div>
          </>
          )}
        </div>
      </div>
    </main>
  );
}