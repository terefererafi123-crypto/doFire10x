import { createSupabaseServerInstance } from '../db/supabase.client.ts';
import { defineMiddleware } from 'astro:middleware';

/**
 * Authentication Middleware
 * 
 * This middleware provides primary route protection for the application.
 * It verifies user authentication for all routes except those listed in PUBLIC_PATHS.
 * 
 * Protection Strategy:
 * 1. Primary protection: Middleware checks authentication and redirects unauthenticated users
 * 2. Defense-in-depth: Individual pages can use requireAuth() helper for additional checks
 * 
 * How it works:
 * - Public paths (login, register, etc.) are allowed without authentication
 * - Protected paths (dashboard, onboarding, etc.) require valid user session
 * - Unauthenticated users accessing protected routes are redirected to /login?error=session_expired
 * - Authenticated users have their user data set in Astro.locals.user
 * 
 * @see src/lib/auth/helpers.ts - requireAuth() function for page-level protection
 * @see .ai/supabase-auth.mdc - Supabase Auth integration guide
 */

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
// All other paths are considered protected and require authentication
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  // Auth API endpoints
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/logout',
];

export const onRequest = defineMiddleware(
  async ({ locals, cookies, url, request, redirect }, next) => {
    try {
      // Skip auth check for public paths
      if (PUBLIC_PATHS.includes(url.pathname)) {
        const supabase = createSupabaseServerInstance({
          cookies,
          headers: request.headers,
        });
        locals.supabase = supabase;
        return next();
      }

      // For protected paths, verify user authentication
      const supabase = createSupabaseServerInstance({
        cookies,
        headers: request.headers,
      });

      // IMPORTANT: Always get user session first before any other operations
      // This verifies the JWT token and retrieves user data
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user) {
        // User is authenticated - set user data in locals for use in pages
        locals.user = {
          email: user.email,
          id: user.id,
        };
        locals.supabase = supabase;
        return next();
      } else {
        // User is not authenticated
        // Log for debugging (especially for onboarding redirects after login)
        if (url.pathname === '/onboarding') {
          console.log('Middleware: No user found for /onboarding', {
            hasCookies: cookies.getAll().length > 0,
            cookieNames: cookies.getAll().map(c => c.name),
            userError: userError?.message,
          });
        }
        
        // For API routes, return 401 instead of redirecting
        if (url.pathname.startsWith('/api/')) {
          locals.supabase = supabase;
          // Let the API route handle the 401 response
          return next();
        }
        
        // For page routes, redirect to login with error message
        // This handles both expired sessions and unauthorized access attempts
        return redirect('/login?error=session_expired');
      }

      locals.supabase = supabase;
      return next();
    } catch (error) {
      // Handle errors in middleware (e.g., missing environment variables)
      console.error('Middleware error:', error);
      
      // If it's a configuration error, allow public paths to continue
      // but redirect protected paths to login
      if (PUBLIC_PATHS.includes(url.pathname)) {
        return next();
      }
      
      // For protected paths, redirect to login on error
      return redirect('/login?error=session_expired');
    }
  },
);