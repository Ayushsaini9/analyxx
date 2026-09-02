/**
 * Centralized configuration — single source of truth for all environment-driven values.
 *
 * All client-side env vars MUST be prefixed with NEXT_PUBLIC_ to be available in the browser.
 * Server-only secrets (e.g. GROQ_API_KEY) must NOT be exported from this module.
 */

/** Backend API base URL (no trailing slash) */
export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Versioned API base — all domain endpoints (auth, papers, etc.) live here.
 * When migrating to v2, update the version segment in one place.
 */
export const API_BASE: string = `${API_URL}/api/v1`;

/** Storage URL for the library-papers (R2 CDN) */
export const STORAGE_URL: string =
  process.env.NEXT_PUBLIC_STORAGE_URL || "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers";

/** Google OAuth 2.0 Client ID */
export const GOOGLE_CLIENT_ID: string =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/** Razorpay publishable key (safe for client-side) */
export const RAZORPAY_KEY_ID: string =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

// ── Runtime validation (development only) ──
if (process.env.NODE_ENV === "development") {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn(
      "[config] NEXT_PUBLIC_API_URL is not set — falling back to http://localhost:8000"
    );
  }
  if (!process.env.NEXT_PUBLIC_STORAGE_URL) {
    console.warn(
      "[config] NEXT_PUBLIC_STORAGE_URL is not set — library PDF links will fallback to default R2 CDN"
    );
  }
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    console.warn(
      "[config] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google sign-in will not work"
    );
  }
}
