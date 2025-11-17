import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EmptyStateProps } from "./types";

const MESSAGES: Record<EmptyStateProps["type"], { title: string; description: string }> = {
  "no-profile": {
    title: "Uzupełnij profil",
    description: "Aby zobaczyć swoje wskaźniki FIRE, uzupełnij profil i dodaj inwestycje.",
  },
  "no-investments": {
    title: "Brak inwestycji",
    description: "Dodaj inwestycje, aby zobaczyć swoje wskaźniki FIRE.",
  },
  "no-data": {
    title: "Brak danych",
    description: "Aby zobaczyć swoje wskaźniki FIRE, uzupełnij profil i dodaj inwestycje.",
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const message = MESSAGES[type];

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-2 text-lg font-semibold">{message.title}</h3>
        <p className="mb-6 text-sm text-muted-foreground">{message.description}</p>
        <div className="flex gap-4">
          {type === "no-profile" && (
            <Button asChild variant="outline">
              <a href="/onboarding">Uzupełnij profil</a>
            </Button>
          )}
          <Button asChild>
            <a href="/investments">Dodaj inwestycję</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
