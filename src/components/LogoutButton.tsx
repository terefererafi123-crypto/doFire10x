import * as React from "react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
}

export function LogoutButton({ 
  className,
  variant = "outline",
  size = "sm"
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = React.useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Nie udało się wylogować");
      }

      // Redirect to login page after successful logout
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
      // Even if there's an error, try to redirect to login
      window.location.href = "/login";
    }
  }, [isLoading]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      aria-busy={isLoading}
      aria-label="Wyloguj się z aplikacji"
    >
      {isLoading ? (
        <>
          <span className="mr-2" aria-hidden="true">Wylogowywanie...</span>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span className="sr-only">Wylogowywanie</span>
        </>
      ) : (
        "Wyloguj"
      )}
    </Button>
  );
}

