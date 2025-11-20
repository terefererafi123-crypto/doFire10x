/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        email: string;
        id: string;
      };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly BYPASS_AUTH?: string; // Set to "true" to bypass authentication for testing
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_REFERER?: string;
  readonly OPENROUTER_APP_TITLE?: string;
  readonly OPENROUTER_TIMEOUT?: string;
  readonly OPENROUTER_MAX_RETRIES?: string;
  readonly OPENROUTER_RETRY_DELAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
