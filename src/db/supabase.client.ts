import type { AstroCookies } from 'astro';
import {
  createBrowserClient,
  createServerClient,
  type CookieOptionsWithName,
} from '@supabase/ssr';

import type { Database } from '../db/database.types.ts';

export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: import.meta.env.PROD, // Only secure in production (HTTPS)
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
  try {
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
            // Parse Cookie header (most reliable for SSR)
            const cookieHeader = context.headers.get('Cookie') ?? '';
            const parsedCookies = parseCookieHeader(cookieHeader);
            
            // If cookies found in header, return them
            if (parsedCookies.length > 0) {
              return parsedCookies;
            }
            
            // If no cookies in header, try AstroCookies as fallback (if available)
            try {
              // @ts-expect-error - getAll() exists at runtime but may not be in type definitions
              const astroCookies = context.cookies.getAll();
              if (Array.isArray(astroCookies) && astroCookies.length > 0) {
                return astroCookies.map((c: { name: string; value: string }) => ({ 
                  name: c.name, 
                  value: c.value 
                }));
              }
            } catch (error) {
              // AstroCookies.getAll() not available or failed, use parsed cookies
              console.warn('AstroCookies.getAll() failed, using Cookie header:', error);
            }
            
            // Return empty array if no cookies found
            return parsedCookies;
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
  } catch (error) {
    // Log the error for debugging
    console.error('Error creating Supabase server instance:', error);
    throw error;
  }
};

// Client-side Supabase client (for React components)
// Uses PUBLIC_ prefixed env vars for client-side access
// Lazy initialization to avoid errors during server-side module loading
export function getSupabaseClient() {
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
}

// Export a lazy-initialized client for backward compatibility
// This is only initialized when accessed, not during module import
let _supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const supabaseClient = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(_target, prop) {
    if (!_supabaseClient) {
      _supabaseClient = getSupabaseClient();
    }
    return _supabaseClient[prop as keyof typeof _supabaseClient];
  },
});