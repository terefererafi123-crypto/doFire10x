import type { AstroCookies } from 'astro';
import {
  createBrowserClient,
  createServerClient,
  type CookieOptionsWithName,
} from '@supabase/ssr';

import type { Database } from '../db/database.types.ts';

export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

// Server-side Supabase client factory
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required. Please set it in your .env file.');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_KEY is required. Please set it in your .env file.');
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};

// Client-side Supabase client (for React components)
// Uses PUBLIC_ prefixed env vars for client-side access
export const supabaseClient = (() => {
  if (import.meta.env.SSR) {
    // Server-side: return a dummy client (should not be used)
    // Components should use context.locals.supabase instead
    throw new Error(
      'supabaseClient should not be used server-side. Use context.locals.supabase instead.',
    );
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'PUBLIC_SUPABASE_URL is required. Please set it in your .env file.',
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'PUBLIC_SUPABASE_ANON_KEY is required. Please set it in your .env file.',
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
})();