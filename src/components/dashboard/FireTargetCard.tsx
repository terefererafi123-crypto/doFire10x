import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatting";
import type { FireTargetCardProps } from "./types";

export function FireTargetCard({ fireTarget }: FireTargetCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Twoja liczba FIRE</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatCurrency(fireTarget)}</p>
        <p className="mt-2 text-sm text-muted-foreground">Kwota potrzebna do osiągnięcia niezależności finansowej</p>
      </CardContent>
    </Card>
  );
}
