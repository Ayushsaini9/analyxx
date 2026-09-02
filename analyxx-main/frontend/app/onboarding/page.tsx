"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { API_BASE } from "../lib/config";

/* ── Exam options available in Analyxx ── */
const EXAM_OPTIONS = [
  { id: "JEE",   label: "JEE" },
  { id: "NEET",  label: "NEET" },
  { id: "UPSC",  label: "UPSC" },
  { id: "GATE",  label: "GATE" },
  { id: "CAT",   label: "CAT" },
  { id: "SSC",   label: "SSC" },
  { id: "RTU",   label: "RTU" },
  { id: "CBSE",  label: "CBSE" },
  { id: "Other", label: "Other" },
];

/* ── Referral source options ── */
const REFERRAL_OPTIONS = [
  { id: "Word of Mouth" },
  { id: "ChatGPT / AI Chat" },
  { id: "News / Podcasts" },
  { id: "Twitter / X" },
  { id: "YouTube" },
  { id: "Facebook" },
  { id: "LinkedIn" },
  { id: "Instagram" },
  { id: "Google" },
  { id: "Reddit" },
  { id: "TikTok" },
  { id: "Other" },
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  /* ── Step 1 state ── */
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [subscribeEmails, setSubscribeEmails] = useState(false);

  /* ── Step 2 state ── */
  const [name, setName] = useState("");

  /* ── Step 3 state ── */
  const [selectedExam, setSelectedExam] = useState("");

  /* ── Step 4 state ── */
  const [selectedReferral, setSelectedReferral] = useState("");

  /* ── Shared ── */
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  /* ── Auth check + pre-fill ── */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/register";
        return;
      }

      // Pre-fill name from Supabase user metadata (Google OAuth)
      const meta = session.user.user_metadata;
      const prefillName =
        meta?.full_name ?? meta?.name ?? "";
      if (prefillName) setName(prefillName);

      // Check if onboarding is already completed
      try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile.onboarding_completed) {
            window.location.href = "/";
            return;
          }
        }
      } catch {
        // continue with onboarding even if profile check fails
      }

      setCheckingAuth(false);
    })();
  }, []);

  const goForward = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  /* ── Submit onboarding data ── */
  const handleComplete = async (skipReferral = false) => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/register";
        return;
      }

      const res = await fetch(`${API_BASE}/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          exam_target: selectedExam,
          referral_source: skipReferral ? null : selectedReferral || null,
          subscribed_to_emails: subscribeEmails,
          privacy_policy_accepted: privacyAccepted,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save onboarding data");
      }

      // Success — redirect to home
      window.location.href = "/";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoading(false);
    }
  };

  /* ── Loading state ── */
  if (checkingAuth) {
    return (
      <main className="ob-root">
        <style>{globalCSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="ob-spinner" />
          <p style={{ fontSize: "14px", color: "rgba(var(--text-rgb),0.4)", marginTop: "16px" }}>
            Setting up your account…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="ob-root">
      <style>{globalCSS}</style>

      {/* ── Ambient background ── */}
      <div className="ob-bg">
        <div className="ob-glow ob-glow-1" />
        <div className="ob-glow ob-glow-2" />
        <div className="ob-grid-overlay" />
      </div>

      {/* ── Logo ── */}
      <div className="ob-logo-bar">
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px" }}>
          <img src="/logo.png" alt="ANALYXX" className="theme-logo" style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover" }} />
          <span className="ob-font-serif" style={{ fontSize: "20px", fontWeight: 300, color: "var(--text)" }}>
            ANALYXX <em style={{ color: "var(--primary)" }}>AI</em>
          </span>
        </a>
      </div>

      {/* ── Progress dots ── */}
      <div className="ob-progress">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`ob-dot ${i + 1 === step ? "ob-dot-active" : ""} ${i + 1 < step ? "ob-dot-done" : ""}`}
          />
        ))}
      </div>

      {/* ── Step container ── */}
      <div className="ob-container">
        <div className={`ob-step-wrapper ob-slide-${direction}`} key={step}>

          {/* ════════ STEP 1: Privacy & Account ════════ */}
          {step === 1 && (
            <div className="ob-step">
              <h1 className="ob-font-serif ob-title">
                Let&apos;s create your <em className="ob-accent">account</em>
              </h1>
              <p className="ob-subtitle">A few things for you to review</p>

              <div className="ob-card">
                {/* Privacy Policy checkbox */}
                <label className="ob-checkbox-row">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="ob-checkbox"
                  />
                  <span className="ob-checkbox-text">
                    I consent to collection and use of my personal information in accordance with the{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="ob-link">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>

                {/* Subscribe checkbox */}
                <label className="ob-checkbox-row">
                  <input
                    type="checkbox"
                    checked={subscribeEmails}
                    onChange={(e) => setSubscribeEmails(e.target.checked)}
                    className="ob-checkbox"
                  />
                  <span className="ob-checkbox-text">
                    Subscribe to occasional promotional emails and notifications. You can opt out at any time.
                  </span>
                </label>

                <button
                  className="ob-btn ob-btn-primary"
                  disabled={!privacyAccepted}
                  onClick={goForward}
                >
                  Create account
                </button>
              </div>
            </div>
          )}

          {/* ════════ STEP 2: Name ════════ */}
          {step === 2 && (
            <div className="ob-step">
              <h1 className="ob-font-serif ob-title">
                What&apos;s your <em className="ob-accent">name</em>?
              </h1>
              <p className="ob-subtitle">So ANALYXX knows what to call you.</p>

              <div className="ob-card">
                <input
                  type="text"
                  className="ob-input"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim().length >= 2) goForward();
                  }}
                  autoFocus
                  autoComplete="name"
                />

                <button
                  className="ob-btn ob-btn-primary"
                  disabled={name.trim().length < 2}
                  onClick={goForward}
                >
                  Continue
                </button>
              </div>

              <button className="ob-back-link" onClick={goBack}>
                ← Back
              </button>
            </div>
          )}

          {/* ════════ STEP 3: Target Exam ════════ */}
          {step === 3 && (
            <div className="ob-step">
              <h1 className="ob-font-serif ob-title">
                Which exam are you <em className="ob-accent">targeting</em>?
              </h1>

              <div className="ob-grid">
                {EXAM_OPTIONS.map((exam) => (
                  <button
                    key={exam.id}
                    className={`ob-option-card ${selectedExam === exam.id ? "ob-option-selected" : ""}`}
                    onClick={() => setSelectedExam(exam.id)}
                  >
                    <span className="ob-option-label">{exam.label}</span>
                  </button>
                ))}
              </div>

              <button
                className="ob-btn ob-btn-primary"
                disabled={!selectedExam}
                onClick={goForward}
                style={{ marginTop: "32px" }}
              >
                Continue
              </button>

              <button className="ob-back-link" onClick={goBack}>
                ← Back
              </button>
            </div>
          )}

          {/* ════════ STEP 4: Referral Source ════════ */}
          {step === 4 && (
            <div className="ob-step">
              <h1 className="ob-font-serif ob-title">
                How did you hear <em className="ob-accent">about us</em>?
              </h1>
              <p className="ob-subtitle">Select one that applies.</p>

              <div className="ob-grid ob-grid-referral">
                {REFERRAL_OPTIONS.map((ref) => (
                  <button
                    key={ref.id}
                    className={`ob-option-card ob-option-referral ${selectedReferral === ref.id ? "ob-option-selected" : ""}`}
                    onClick={() => setSelectedReferral(ref.id)}
                  >
                    <span className="ob-option-label">{ref.id}</span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="ob-error">{error}</div>
              )}

              <button
                className="ob-btn ob-btn-primary"
                disabled={loading}
                onClick={() => handleComplete(false)}
                style={{ marginTop: "32px" }}
              >
                {loading ? "Setting up…" : "Let's go"}
              </button>

              <button
                className="ob-skip-link"
                onClick={() => handleComplete(true)}
                disabled={loading}
              >
                Skip
              </button>

              <button className="ob-back-link" onClick={goBack} disabled={loading}>
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ── All styles ── */
const globalCSS = `
  /* ── Root ── */
  .ob-root {
    min-height: 100vh;
    background: var(--bg, #050505);
    color: var(--text, #EBEBEB);
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .ob-font-serif { font-family: 'Newsreader', serif; }

  /* ── Ambient BG ── */
  .ob-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
  .ob-glow {
    position: absolute; border-radius: 50%;
    filter: blur(120px); opacity: 0.8;
  }
  .ob-glow-1 {
    top: -120px; right: -120px;
    width: 420px; height: 420px;
    background: rgba(var(--primary-rgb, 16,185,129), 0.07);
    animation: ob-morph 12s ease-in-out infinite;
  }
  .ob-glow-2 {
    bottom: -140px; left: -140px;
    width: 380px; height: 380px;
    background: rgba(var(--primary-rgb, 16,185,129), 0.05);
    animation: ob-morph 16s ease-in-out infinite reverse;
  }
  .ob-grid-overlay {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 60px 60px;
  }
  @keyframes ob-morph {
    0%,100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
    50%     { border-radius: 60% 40% 40% 60% / 30% 70% 30% 70%; }
  }

  /* ── Logo ── */
  .ob-logo-bar {
    position: relative; z-index: 2;
    padding: 28px 20px 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  /* ── Progress dots ── */
  .ob-progress {
    position: relative; z-index: 2;
    display: flex; gap: 8px;
    padding: 28px 0 0;
  }
  .ob-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(var(--text-rgb, 235,235,235), 0.12);
    transition: all 400ms cubic-bezier(0.16,1,0.3,1);
  }
  .ob-dot-active {
    background: var(--primary, #10b981);
    width: 24px;
    border-radius: 4px;
    box-shadow: 0 0 12px rgba(var(--primary-rgb, 16,185,129), 0.4);
  }
  .ob-dot-done {
    background: rgba(var(--primary-rgb, 16,185,129), 0.4);
  }

  /* ── Container ── */
  .ob-container {
    position: relative; z-index: 2;
    width: 100%; max-width: 520px;
    padding: 40px 24px 60px;
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  /* ── Step animation ── */
  .ob-step-wrapper {
    width: 100%;
  }
  .ob-slide-forward {
    animation: ob-slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  .ob-slide-back {
    animation: ob-slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes ob-slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes ob-slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* ── Step content ── */
  .ob-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .ob-title {
    font-size: clamp(28px, 5vw, 38px);
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0 0 10px;
  }
  .ob-accent {
    color: var(--primary, #10b981);
    font-style: italic;
  }
  .ob-subtitle {
    font-size: 15px;
    color: rgba(var(--text-rgb, 235,235,235), 0.4);
    font-weight: 300;
    margin: 0 0 32px;
  }

  /* ── Card ── */
  .ob-card {
    width: 100%;
    background: rgba(255,255,255,0.02);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Checkboxes ── */
  .ob-checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    cursor: pointer;
    text-align: left;
    padding: 4px 0;
  }
  .ob-checkbox {
    flex-shrink: 0;
    width: 20px; height: 20px;
    margin-top: 2px;
    border-radius: 6px;
    border: 1.5px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    accent-color: var(--primary, #10b981);
    appearance: auto;
  }
  .ob-checkbox:checked {
    border-color: var(--primary, #10b981);
  }
  .ob-checkbox-text {
    font-size: 14px;
    line-height: 1.55;
    color: rgba(var(--text-rgb, 235,235,235), 0.65);
    font-weight: 300;
  }
  .ob-link {
    color: rgba(var(--text-rgb, 235,235,235), 0.85);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(var(--text-rgb, 235,235,235), 0.25);
    transition: color 200ms;
  }
  .ob-link:hover {
    color: var(--primary, #10b981);
    text-decoration-color: var(--primary, #10b981);
  }

  /* ── Input ── */
  .ob-input {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 16px 20px;
    color: var(--text, #EBEBEB);
    font-size: 16px;
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 300ms, box-shadow 300ms;
  }
  .ob-input:focus {
    border-color: rgba(var(--primary-rgb, 16,185,129), 0.5);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 16,185,129), 0.08);
  }
  .ob-input::placeholder {
    color: rgba(var(--text-rgb, 235,235,235), 0.2);
  }

  /* ── Option grid ── */
  .ob-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    width: 100%;
  }
  .ob-grid-referral {
    grid-template-columns: repeat(2, 1fr);
  }

  .ob-option-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px 14px;
    background: rgba(255,255,255,0.025);
    border: 1.5px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    cursor: pointer;
    transition: all 250ms cubic-bezier(0.16,1,0.3,1);
    color: rgba(var(--text-rgb, 235,235,235), 0.75);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    min-height: 64px;
    text-align: center;
  }
  .ob-option-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.15);
    transform: translateY(-1px);
  }
  .ob-option-selected {
    border-color: var(--primary, #10b981) !important;
    background: rgba(var(--primary-rgb, 16,185,129), 0.06) !important;
    color: var(--text, #EBEBEB) !important;
    box-shadow: 0 0 24px rgba(var(--primary-rgb, 16,185,129), 0.12);
  }
  .ob-option-label {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .ob-option-referral {
    padding: 16px 16px;
  }

  /* ── Buttons ── */
  .ob-btn {
    width: 100%;
    padding: 16px;
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 300ms cubic-bezier(0.16,1,0.3,1);
    border: none;
  }
  .ob-btn-primary {
    background: var(--primary, #10b981);
    color: #003824;
    box-shadow: 0 0 24px rgba(var(--primary-rgb, 16,185,129), 0.15);
  }
  .ob-btn-primary:hover:not(:disabled) {
    filter: brightness(1.12);
    transform: translateY(-1px);
    box-shadow: 0 0 36px rgba(var(--primary-rgb, 16,185,129), 0.25);
  }
  .ob-btn-primary:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }
  .ob-btn-primary:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ob-back-link {
    background: none;
    border: none;
    color: rgba(var(--text-rgb, 235,235,235), 0.3);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    margin-top: 16px;
    padding: 8px 16px;
    border-radius: 8px;
    transition: color 200ms, background 200ms;
  }
  .ob-back-link:hover {
    color: rgba(var(--text-rgb, 235,235,235), 0.6);
    background: rgba(255,255,255,0.03);
  }

  .ob-skip-link {
    background: none;
    border: none;
    color: rgba(var(--text-rgb, 235,235,235), 0.35);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    margin-top: 12px;
    padding: 8px 24px;
    border-radius: 8px;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgba(var(--text-rgb, 235,235,235), 0.15);
    transition: color 200ms;
  }
  .ob-skip-link:hover {
    color: rgba(var(--text-rgb, 235,235,235), 0.6);
    text-decoration-color: rgba(var(--text-rgb, 235,235,235), 0.3);
  }
  .ob-skip-link:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Error ── */
  .ob-error {
    width: 100%;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.18);
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    color: #fca5a5;
    text-align: center;
    margin-top: 12px;
  }

  /* ── Spinner ── */
  .ob-spinner {
    width: 28px; height: 28px;
    border: 2.5px solid rgba(var(--primary-rgb, 16,185,129), 0.15);
    border-top-color: var(--primary, #10b981);
    border-radius: 50%;
    animation: ob-spin 0.8s linear infinite;
  }
  @keyframes ob-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 560px) {
    .ob-container { padding: 32px 16px 40px; }
    .ob-card { padding: 24px 20px; }
    .ob-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .ob-grid-referral { grid-template-columns: 1fr 1fr; gap: 8px; }
    .ob-option-card { padding: 18px 8px; min-height: 56px; }
    .ob-option-referral { padding: 14px 10px; }
    .ob-title { font-size: 28px; }
    .ob-input { font-size: 16px; } /* prevent iOS zoom */
  }

  @media (max-width: 380px) {
    .ob-grid { grid-template-columns: repeat(2, 1fr); }
    .ob-grid-referral { grid-template-columns: 1fr; }
  }
`;
