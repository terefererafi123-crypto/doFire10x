import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { InvestmentDto, ApiError } from "@/types";
import { getAuthToken } from "@/lib/auth/client-helpers";
import { EditInvestmentModal } from "./EditInvestmentModal";

const REQUEST_TIMEOUT_MS = 30000;

export function InvestmentsList() {
  const [investments, setInvestments] = React.useState<InvestmentDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = React.useState<InvestmentDto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const fetchInvestments = React.useCallback(async () => {
    console.log("InvestmentsList: fetchInvestments called");
    setIsLoading(true);
    setError(null);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Brak sesji. Zaloguj się ponownie.");
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch("/api/v1/investments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
        cache: "no-store", // Prevent browser cache to ensure fresh data
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ApiError = await response.json();
        if (error.error.code === "unauthorized" || error.error.code === "forbidden") {
          // Redirect to login for auth errors
          window.location.href = "/login?error=session_expired";
          return;
        }
        throw error;
      }

      const data = await response.json();
      console.log("InvestmentsList: Fetched investments:", data.items);
      setInvestments(data.items || []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Żądanie trwa zbyt długo – spróbuj ponownie");
      } else if (err && typeof err === "object" && "error" in err) {
        const apiError = err as ApiError;
        setError(apiError.error.message || "Wystąpił błąd podczas ładowania inwestycji");
      } else {
        setError("Wystąpił błąd podczas ładowania inwestycji");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pl-PL");
  };

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      etf: "ETF",
      bond: "Obligacje",
      stock: "Akcje",
      cash: "Gotówka",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Moje inwestycje</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Ładowanie...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Moje inwestycje</CardTitle>
            <Button onClick={() => window.location.href = "/onboarding?step=2"}>
              Dodaj inwestycję
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {investments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Brak inwestycji</p>
              <Button onClick={() => window.location.href = "/onboarding?step=2"}>
                Dodaj pierwszą inwestycję
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{getAssetTypeLabel(investment.type)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(investment.amount)} • {formatDate(investment.acquired_at)}
                    </div>
                    {investment.notes && (
                      <div className="text-sm text-muted-foreground mt-1">{investment.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingInvestment(investment);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Edytuj
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Czy na pewno chcesz usunąć tę inwestycję?")) {
                          try {
                            const authToken = await getAuthToken();
                            if (!authToken) {
                              setError("Brak sesji. Zaloguj się ponownie.");
                              return;
                            }

                            const response = await fetch(`/api/v1/investments/${investment.id}`, {
                              method: "DELETE",
                              headers: {
                                Authorization: `Bearer ${authToken}`,
                              },
                            });

                            if (!response.ok) {
                              const error: ApiError = await response.json();
                              setError(error.error.message || "Nie udało się usunąć inwestycji");
                              return;
                            }

                            // Refresh list
                            fetchInvestments();
                          } catch (err) {
                            setError("Wystąpił błąd podczas usuwania inwestycji");
                          }
                        }
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <EditInvestmentModal
        investment={editingInvestment}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={() => {
          console.log("InvestmentsList: onSuccess called, refreshing investments list");
          fetchInvestments();
          setEditingInvestment(null);
        }}
      />
    </div>
  );
}

