"use client";
import { useState, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════
   Cookie Consent Banner — GDPR / IT Act compliant
   ══════════════════════════════════════════════════ */

const STORAGE_KEY = "analyxx-cookie-consent";
const GA_ID = "G-GMHGEMS0K6";

export interface CookiePreferences {
  essential: boolean; // Always true — required for site operation
  analytics: boolean; // Google Analytics, usage tracking
  marketing: boolean; // Personalization, targeted content
  timestamp: string;  // ISO date of consent
}

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  timestamp: "",
};

/** Load GA script dynamically when analytics consent is granted */
function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;
  // Avoid double-loading
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)) return;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // @ts-expect-error gtag global
  window.dataLayer = window.dataLayer || [];
  // @ts-expect-error gtag global
  window.gtag = function (...args: unknown[]) { window.dataLayer.push(args); };
  // @ts-expect-error gtag global
  window.gtag("js", new Date());
  // @ts-expect-error gtag global
  window.gtag("config", GA_ID);
}

/** Disable GA tracking */
function disableGoogleAnalytics() {
  if (typeof window === "undefined") return;
  // Set the GA opt-out flag
  // @ts-expect-error GA opt-out window property
  window[`ga-disable-${GA_ID}`] = true;
}

/** Read stored preferences */
export function getStoredConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({ ...DEFAULT_PREFS });
  const [animatingOut, setAnimatingOut] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsIframe(window.self !== window.top || window.location.search.includes("sidebar=true"));
    }
  }, []);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay so page loads first
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    } else {
      // Apply stored preferences
      if (stored.analytics) loadGoogleAnalytics();
      else disableGoogleAnalytics();
    }
  }, []);

  const save = useCallback((consent: CookiePreferences) => {
    const withTimestamp = { ...consent, timestamp: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
    } catch (error) {
      console.error("Failed to save cookie preferences:", error);
    }

    if (withTimestamp.analytics) loadGoogleAnalytics();
    else disableGoogleAnalytics();

    setAnimatingOut(true);
    setTimeout(() => {
      setVisible(false);
      setAnimatingOut(false);
    }, 400);
  }, []);

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true, timestamp: "" });
  const rejectAll = () => save({ essential: true, analytics: false, marketing: false, timestamp: "" });
  const saveCustom = () => save(prefs);

  if (!visible) return null;

  return (
    <>
      {/* Floating bottom-right banner — non-blocking */}
      <div
        id="cookie-consent-banner"
        role="dialog"
        aria-label="Cookie settings"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          width: "min(400px, calc(100vw - 40px))",
          opacity: animatingOut ? 0 : 1,
          transform: animatingOut ? "translateX(30px) scale(0.95)" : "translateX(0) scale(1)",
          transition: "opacity 400ms ease, transform 400ms ease",
          animation: "cookieSlideIn 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            background: "rgba(17,17,17,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: "24px 22px 22px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Header row with close button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "#e8e4de",
                fontFamily: "var(--font-space-grotesk, 'Space Grotesk'), sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              Cookie settings
            </h2>
            {/* Dismiss / close button */}
            <button
              id="cookie-dismiss-btn"
              onClick={() => {
                setAnimatingOut(true);
                setTimeout(() => { setVisible(false); setAnimatingOut(false); }, 400);
              }}
              aria-label="Dismiss cookie banner"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.3)",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                transition: "color 200ms, background 200ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                e.currentTarget.style.background = "none";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "0.82rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            }}
          >
            We use cookies to deliver and improve our services, analyze site usage, and personalize
            your experience.{" "}
            <a
              href="/cookie-policy"
              style={{
                color: "rgba(255,255,255,0.6)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Cookie Policy
            </a>
          </p>

          {/* Customize Panel */}
          {showCustomize && (
            <div
              style={{
                marginBottom: 14,
                padding: "14px 12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                animation: "cookieFadeIn 300ms ease",
              }}
            >
              <CookieToggle
                label="Essential"
                description="Required for the site to function."
                checked={true}
                disabled={true}
                onChange={() => {}}
              />
              <div style={{ height: 10 }} />
              <CookieToggle
                label="Analytics"
                description="Help us understand how you use ANALYXX."
                checked={prefs.analytics}
                disabled={false}
                onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
              <div style={{ height: 10 }} />
              <CookieToggle
                label="Marketing"
                description="Personalize your experience."
                checked={prefs.marketing}
                disabled={false}
                onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!showCustomize ? (
              <button
                id="cookie-customize-btn"
                onClick={() => setShowCustomize(true)}
                style={{
                  width: "100%",
                  padding: "11px 20px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  color: "#e0e0e0",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "border-color 200ms, background 200ms",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Customize Cookie Settings
              </button>
            ) : (
              <button
                id="cookie-save-btn"
                onClick={saveCustom}
                style={{
                  width: "100%",
                  padding: "11px 20px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  color: "#e0e0e0",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "border-color 200ms, background 200ms",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Save Preferences
              </button>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                id="cookie-reject-btn"
                onClick={rejectAll}
                style={{
                  padding: "11px 16px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  color: "#e0e0e0",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "border-color 200ms, background 200ms",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Reject All
              </button>

              <button
                id="cookie-accept-btn"
                onClick={acceptAll}
                style={{
                  padding: "11px 16px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  color: "#111",
                  background: "#f5f5f0",
                  border: "1.5px solid #f5f5f0",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "opacity 200ms, transform 100ms",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations + mobile responsive */}
      <style>{`
        @keyframes cookieSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes cookieSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cookieFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          #cookie-consent-banner {
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            animation: cookieSlideUp 500ms cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          #cookie-consent-banner > div {
            border-radius: 16px 16px 0 0 !important;
            padding: 20px 16px 18px !important;
            box-shadow: 0 -8px 40px rgba(0,0,0,0.5) !important;
          }
        }
      `}</style>
    </>
  );
}

/* ── Toggle Row Sub-Component ── */

function CookieToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#e8e4de",
            marginBottom: 3,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          }}
        >
          {label}
          {disabled && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.3)",
                marginLeft: 8,
                fontWeight: 400,
              }}
            >
              Always on
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.5,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          }}
        >
          {description}
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={`${label} cookies`}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          flexShrink: 0,
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 12,
          border: "none",
          background: checked
            ? disabled
              ? "rgba(255,255,255,0.15)"
              : "var(--primary, #10b981)"
            : "rgba(255,255,255,0.1)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 200ms ease",
          padding: 0,
          opacity: disabled ? 0.5 : 1,
          marginTop: 2,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}
