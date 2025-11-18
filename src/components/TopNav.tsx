import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="border-b bg-background" role="navigation" aria-label="Główne menu">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="text-lg font-bold">
            DoFIRE
          </a>
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
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Wyloguj
        </Button>
      </div>
    </nav>
  );
}


