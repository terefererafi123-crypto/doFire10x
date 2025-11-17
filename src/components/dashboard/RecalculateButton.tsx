import { Button } from "@/components/ui/button";
import type { RecalculateButtonProps } from "./types";

export function RecalculateButton({
  onClick,
  isLoading,
  disabled = false,
}: RecalculateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="w-full"
      aria-busy={isLoading}
      aria-disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <span className="mr-2" aria-hidden="true">
            Przeliczanie...
          </span>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span className="sr-only">Przeliczanie wskaźników</span>
        </>
      ) : (
        "Przelicz wskaźniki"
      )}
    </Button>
  );
}
