import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required. Please set it in your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_KEY is required. Please set it in your .env file.');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);