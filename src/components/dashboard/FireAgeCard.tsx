import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAge } from "@/lib/utils/formatting";
import type { FireAgeCardProps } from "./types";

export function FireAgeCard({ timeToFire, note }: FireAgeCardProps) {
  const { years_to_fire, fire_age, birth_date } = timeToFire;

  // If years_to_fire is null, show note message
  if (years_to_fire === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wiek FIRE</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {note || "Lata do FIRE nie mogą zostać obliczone przy zerowych inwestycjach."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // If fire_age is null but years_to_fire is not, show only years
  if (fire_age === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wiek FIRE</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">Za {years_to_fire} lat</p>
          {!birth_date && (
            <p className="mt-2 text-sm text-muted-foreground">
              Uzupełnij datę urodzenia, aby zobaczyć wiek FIRE
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Both values available
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wiek FIRE</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">Osiągniesz FIRE w wieku {formatAge(fire_age)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Za {years_to_fire} lat
        </p>
      </CardContent>
    </Card>
  );
}
