import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/formatting";
import type { PortfolioSummaryListProps } from "./types";

const ASSET_TYPE_LABELS: Record<keyof NonNullable<PortfolioSummaryListProps["shares"]>, string> = {
  etf: "ETF",
  stock: "Akcje",
  bond: "Obligacje",
  cash: "Gotówka",
};

export function PortfolioSummaryList({ shares, isLoading }: PortfolioSummaryListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Struktura portfela</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (!shares) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Struktura portfela</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Brak danych o portfelu</p>
        </CardContent>
      </Card>
    );
  }

  // Check if all shares are 0
  const totalShare = shares.etf + shares.stock + shares.bond + shares.cash;
  if (totalShare === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Struktura portfela</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Brak danych o portfelu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Struktura portfela</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Object.entries(shares).map(([key, value]) => {
            const assetKey = key as keyof typeof shares;
            return (
              <li key={key} className="flex items-center justify-between">
                <span className="text-sm">{ASSET_TYPE_LABELS[assetKey]}:</span>
                <span className="font-medium">{formatPercent(value / 100, 2)}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
