/**
 * Shared auth utilities for frontend pages.
 *
 * Replaces all localStorage-based token management with Supabase sessions.
 */
import { supabase } from "./supabase";

/** Get the current access token (or null if not logged in). */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Get basic user info from the current session. */
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name:
      session.user.user_metadata?.full_name ??
      session.user.user_metadata?.name ??
      session.user.email?.split("@")[0] ??
      "",
  };
}

/** Sign out and redirect to login. */
export async function signOut(redirectTo = "/login") {
  await supabase.auth.signOut();
  window.location.href = redirectTo;
}

/** Check if user is logged in (synchronous check from cached session). */
export function onAuthStateChange(
  callback: (isLoggedIn: boolean, user: any) => void
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session, session?.user ?? null);
  });
}
