// Client-side authentication helpers for React components

import { supabaseClient } from "@/db/supabase.client";

/**
 * Retrieves the current authentication token from Supabase session
 * @returns Promise resolving to the access token, or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  return session?.access_token ?? null;
}

