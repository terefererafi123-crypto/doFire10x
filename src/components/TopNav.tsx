import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";
import { getAuthToken } from "@/lib/auth/client-helpers";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Check session on mount
    const checkAuth = async () => {
      // Try getSession() first
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError) {
        console.error("TopNav: Error getting session:", sessionError.message);
      }
      
      if (session) {
        console.log("TopNav: Session found, user:", session.user?.email);
        setIsAuthenticated(true);
        setUserEmail(session.user?.email || null);
        return;
      }

      // Fallback: try getUser() (works better with cookies)
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error("TopNav: Error getting user:", userError.message);
      }
      
      if (user) {
        console.log("TopNav: User found via getUser(), email:", user.email);
        setIsAuthenticated(true);
        setUserEmail(user.email || null);
        return;
      }

      // Fallback: check sessionStorage and try to restore session
      if (typeof window !== "undefined") {
        const sessionStorageData = sessionStorage.getItem('supabase.auth.session');
        if (sessionStorageData) {
          try {
            const parsedSession = JSON.parse(sessionStorageData);
            if (parsedSession.access_token) {
              console.log("TopNav: Session found in sessionStorage, attempting to restore...");
              // Try to set session in Supabase
              const { error: setError } = await supabaseClient.auth.setSession({
                access_token: parsedSession.access_token,
                refresh_token: parsedSession.refresh_token,
              });
              
              if (!setError) {
                // Session restored, try to get user
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                  console.log("TopNav: Session restored, user:", user.email);
                  setIsAuthenticated(true);
                  setUserEmail(user.email || null);
                  return;
                }
              }
              
              // If setSession failed or getUser failed, use sessionStorage data directly
              console.log("TopNav: Using sessionStorage data directly");
              setIsAuthenticated(true);
              setUserEmail(parsedSession.user?.email || null);
              return;
            }
          } catch (e) {
            console.error("TopNav: Error parsing sessionStorage:", e);
          }
        }
      }

      // No session found
      console.log("TopNav: No session found, user not authenticated");
      setIsAuthenticated(false);
      setUserEmail(null);
    };

    // Check immediately
    checkAuth();

    // Also check again after delays (in case session is still syncing)
    const timeoutId1 = setTimeout(() => {
      console.log("TopNav: Rechecking auth after 300ms...");
      checkAuth();
    }, 300);
    
    const timeoutId2 = setTimeout(() => {
      console.log("TopNav: Rechecking auth after 1000ms...");
      checkAuth();
    }, 1000);

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("TopNav: Auth state changed:", event, session?.user?.email);
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/login";
  };

  // Show loading state while checking authentication
  // But also check if we can find session quickly
  // If isAuthenticated is null, show minimal nav, but keep checking
  const showMinimalNav = isAuthenticated === null;

  // Determine if user is authenticated (optimistic: if null, assume false for now)
  const authenticated = isAuthenticated === true;

  return (
    <nav className="border-b bg-background" role="navigation" aria-label="Główne menu">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href={authenticated ? "/dashboard" : "/"} className="text-lg font-bold">
            DoFIRE
          </a>
          {authenticated && (
            <>
              <div className="hidden md:flex gap-4">
                <a
                  href="/dashboard"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dashboard
                </a>
                <a
                  href="/investments"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Inwestycje
                </a>
                <a
                  href="/onboarding"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Profil
                </a>
              </div>
              {/* Mobile navigation */}
              <div className="flex md:hidden gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <a href="/dashboard">Dashboard</a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/investments">Inwestycje</a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/onboarding">Profil</a>
                </Button>
              </div>
            </>
          )}
        </div>
        {authenticated ? (
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {userEmail}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Wyloguj
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <a href="/login">Zaloguj się</a>
          </Button>
        )}
      </div>
    </nav>
  );
}



