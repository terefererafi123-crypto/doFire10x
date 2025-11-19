import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Check session on mount
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

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

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <nav className="border-b bg-background" role="navigation" aria-label="Główne menu">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <a href="/" className="text-lg font-bold">
              DoFIRE
            </a>
          </div>
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



