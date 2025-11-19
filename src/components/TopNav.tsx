import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Check session on mount - try getSession() first, then fallback to sessionStorage
    const checkAuth = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        return;
      }

      // Fallback to sessionStorage (from LoginForm)
      if (typeof window !== "undefined") {
        const sessionStorageData = sessionStorage.getItem('supabase.auth.session');
        if (sessionStorageData) {
          try {
            const parsedSession = JSON.parse(sessionStorageData);
            if (parsedSession.access_token) {
              setIsAuthenticated(true);
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      setIsAuthenticated(false);
    };

    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/login";
  };

  // If we're on a protected page (dashboard, investments, onboarding), assume user is authenticated
  // This ensures navigation is always visible even if session check is delayed
  const isOnProtectedPage = typeof window !== "undefined" && 
    (window.location.pathname === "/dashboard" || 
     window.location.pathname === "/investments" || 
     window.location.pathname === "/onboarding");

  // Show loading state while checking authentication, but show nav if on protected page
  if (isAuthenticated === null) {
    const shouldShowNav = isOnProtectedPage;
    return (
      <nav className="border-b bg-background" role="navigation" aria-label="Główne menu">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <a href={shouldShowNav ? "/dashboard" : "/"} className="text-lg font-bold">
              DoFIRE
            </a>
            {shouldShowNav && (
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
          {shouldShowNav && (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Wyloguj
            </Button>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background" role="navigation" aria-label="Główne menu">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href={isAuthenticated ? "/dashboard" : "/"} className="text-lg font-bold">
            DoFIRE
          </a>
          {isAuthenticated && (
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
        {isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Wyloguj
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <a href="/login">Zaloguj się</a>
          </Button>
        )}
      </div>
    </nav>
  );
}



