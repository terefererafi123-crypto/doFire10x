import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYearsAndMonths } from "@/lib/utils/formatting";
import type { FireAgeCardProps } from "./types";

export function FireAgeCard({ timeToFire, note }: FireAgeCardProps) {
  const { years_to_fire, fire_age, birth_date, current_age } = timeToFire;

  // Check if return rate is too low (cannot achieve FIRE)
  if (note === "return_rate_too_low") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wiek FIRE</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Przy takiej stopie zwrotu i stopie wypłat portfel nie osiągnie wartości FIRE.
            <br />
            Zwiększ stopę zwrotu, zmniejsz wydatki albo stopę wypłat.
          </p>
        </CardContent>
      </Card>
    );
  }

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

  // Check if FIRE has been achieved (years_to_fire <= 0 or fire_age <= current_age)
  const isFireAchieved = years_to_fire <= 0 || (fire_age !== null && current_age !== null && fire_age <= current_age);

  // If fire_age is null but years_to_fire is not, show only years
  if (fire_age === null) {
    if (isFireAchieved) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Wiek FIRE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">🎉 Gratulacje! Osiągnąłeś FIRE!</p>
            {!birth_date && (
              <p className="mt-2 text-sm text-muted-foreground">Uzupełnij datę urodzenia, aby zobaczyć wiek FIRE</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Obliczenia zakładają, że nie dokonujesz nowych wpłat – portfel rośnie tylko dzięki oczekiwanej stopie
              zwrotu.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Wiek FIRE</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">Za {formatYearsAndMonths(years_to_fire)}</p>
          {!birth_date && (
            <p className="mt-2 text-sm text-muted-foreground">Uzupełnij datę urodzenia, aby zobaczyć wiek FIRE</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Obliczenia zakładają, że nie dokonujesz nowych wpłat – portfel rośnie tylko dzięki oczekiwanej stopie
            zwrotu.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Both values available
  if (isFireAchieved) {
    // Only show age if it's positive and valid
    const showAge = fire_age !== null && fire_age > 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Wiek FIRE</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">🎉 Gratulacje! Osiągnąłeś FIRE!</p>
          {showAge && (
            <p className="mt-2 text-sm text-muted-foreground">
              Osiągnąłeś FIRE w wieku {formatYearsAndMonths(fire_age)}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Obliczenia zakładają, że nie dokonujesz nowych wpłat – portfel rośnie tylko dzięki oczekiwanej stopie
            zwrotu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wiek FIRE</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">Osiągniesz FIRE w wieku {formatYearsAndMonths(fire_age)}</p>
        <p className="mt-2 text-sm text-muted-foreground">Za {formatYearsAndMonths(years_to_fire)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Obliczenia zakładają, że nie dokonujesz nowych wpłat – portfel rośnie tylko dzięki oczekiwanej stopie
          zwrotu.
        </p>
      </CardContent>
    </Card>
  );
}
