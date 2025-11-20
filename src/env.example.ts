/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

// ImportMeta is used by TypeScript for import.meta.env
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly OPENROUTER_REFERER?: string;
  readonly OPENROUTER_APP_TITLE?: string;
  readonly OPENROUTER_TIMEOUT?: string;
  readonly OPENROUTER_MAX_RETRIES?: string;
  readonly OPENROUTER_RETRY_DELAY?: string;
}

// ImportMeta interface is used by TypeScript for import.meta.env type checking
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
