"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Google OAuth callback page.
 *
 * Google redirects here with an id_token in the URL hash fragment
 * (OpenID Connect implicit flow). We extract the token, pass it to
 * Supabase via signInWithIdToken, and redirect the user to their
 * intended destination.
 *
 * This approach lets Google show "continue to analyxx.com" on the
 * consent screen instead of the raw Supabase project URL.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      // id_token is in the hash fragment: #id_token=eyJ...&state=...
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const idToken = params.get("id_token");

      if (!idToken) {
        const errorDesc =
          params.get("error_description") || params.get("error");
        throw new Error(errorDesc || "No ID token received from Google");
      }

      // Retrieve the raw nonce stored by the login/register page
      const rawNonce = sessionStorage.getItem("google_oauth_nonce");
      const redirectTo =
        sessionStorage.getItem("google_oauth_redirect") || "/";
      sessionStorage.removeItem("google_oauth_nonce");
      sessionStorage.removeItem("google_oauth_redirect");

      // Exchange the Google ID token for a Supabase session
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce || undefined,
      });

      if (authError) throw authError;

      // Check if this user needs onboarding
      let needsOnboarding = false;
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
            needsOnboarding = !profile.onboarding_completed;
          }
        }
      } catch {
        // If profile check fails, proceed with normal redirect
      }

      if (needsOnboarding) {
        window.location.href = "/onboarding";
        return;
      }

      // Validate redirect path to prevent open redirects
      const safePath =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/";
      window.location.href = safePath;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    }
  };

  /* ── Error state ── */
  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#e5e2e1",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "420px", padding: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1
            style={{
              fontFamily: "'Newsreader', serif",
              fontSize: "24px",
              fontWeight: 500,
              marginBottom: "12px",
              color: "#ffb4ab",
            }}
          >
            Sign-in failed
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#86948a",
              lineHeight: "1.6",
              marginBottom: "28px",
            }}
          >
            {error}
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#10b981",
              color: "#003824",
              borderRadius: "8px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to login
          </a>
        </div>
      </main>
    );
  }

  /* ── Loading / processing state ── */
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#050505",
        color: "#e5e2e1",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: "spin 1s linear infinite", marginBottom: "16px" }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p
        style={{
          fontSize: "14px",
          color: "#86948a",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        Signing you in…
      </p>
    </main>
  );
}
