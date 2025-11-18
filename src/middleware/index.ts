import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

export const onRequest = defineMiddleware((context, next) => {
  // Create Supabase client with JWT token from Authorization header
  // This ensures RLS (Row Level Security) works correctly
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required. Please set it in your .env file.');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_KEY is required. Please set it in your .env file.');
  }
  
  const authHeader = context.request.headers.get('Authorization');
  
  // Create client with token in headers if Authorization header is present
  const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  
  context.locals.supabase = supabaseClient;
  return next();
});