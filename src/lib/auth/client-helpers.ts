// Client-side authentication helpers for React components

import { supabaseClient } from "@/db/supabase.client";

/**
 * Retrieves the current authentication token from Supabase session
 * Falls back to sessionStorage if getSession() returns null (workaround for @supabase/ssr issue)
 * @returns Promise resolving to the access token, or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  // Try getSession() first
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  // Fallback to sessionStorage (from LoginForm)
  if (typeof window !== "undefined") {
    const sessionStorageData = sessionStorage.getItem("supabase.auth.session");
    if (sessionStorageData) {
      try {
        const parsedSession = JSON.parse(sessionStorageData);
        if (parsedSession.access_token) {
          return parsedSession.access_token;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return null;
}
