import { createSupabaseServerInstance } from '../db/supabase.client.ts';
import { defineMiddleware } from 'astro:middleware';

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/login',
  // Auth API endpoints
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/logout',
];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    // Skip auth check for public paths
    if (PUBLIC_PATHS.includes(url.pathname)) {
      const supabase = createSupabaseServerInstance({
        cookies,
        headers: request.headers,
      });
      locals.supabase = supabase;
      return next();
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // IMPORTANT: Always get user session first before any other operations
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      locals.user = {
        email: user.email,
        id: user.id,
      };
    } else if (!PUBLIC_PATHS.includes(url.pathname)) {
      // Redirect to login for protected routes
      return redirect('/login');
    }

    locals.supabase = supabase;
    return next();
  },
);