import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercent } from "@/lib/utils/formatting";
import type { FireProgressCardProps } from "./types";

export function FireProgressCard({ fireProgress }: FireProgressCardProps) {
  const percentage = Math.min(Math.max(fireProgress * 100, 0), 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Postęp do FIRE</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-2xl font-bold">{formatPercent(fireProgress)}</p>
        <Progress value={percentage} max={100} />
      </CardContent>
    </Card>
  );
}
