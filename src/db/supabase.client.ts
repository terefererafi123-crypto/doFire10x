import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

// Use PUBLIC_ prefixed variables for client-side, regular variables for server-side
const supabaseUrl = import.meta.env.SSR 
  ? import.meta.env.SUPABASE_URL 
  : import.meta.env.PUBLIC_SUPABASE_URL;
  
const supabaseAnonKey = import.meta.env.SSR 
  ? import.meta.env.SUPABASE_KEY 
  : import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    import.meta.env.SSR 
      ? 'SUPABASE_URL is required. Please set it in your .env file.'
      : 'PUBLIC_SUPABASE_URL is required. Please set it in your .env file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    import.meta.env.SSR 
      ? 'SUPABASE_KEY is required. Please set it in your .env file.'
      : 'PUBLIC_SUPABASE_ANON_KEY is required. Please set it in your .env file.'
  );
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);