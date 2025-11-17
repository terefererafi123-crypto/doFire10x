import { useDashboard } from "./useDashboard";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardGrid } from "./DashboardGrid";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DashboardContent() {
  const { metrics, aiHint, isLoading, error, recalculateMetrics } = useDashboard();

  const shares = aiHint?.shares ?? null;
  const isRecalculateDisabled = !metrics && !isLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error.error.message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <DashboardGrid
          metrics={metrics}
          isLoading={isLoading}
          aiHint={aiHint}
          shares={shares}
          onRecalculate={recalculateMetrics}
          isRecalculateDisabled={isRecalculateDisabled}
        />
      )}
    </div>
  );
}
