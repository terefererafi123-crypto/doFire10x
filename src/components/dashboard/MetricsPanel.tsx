import { FireTargetCard } from "./FireTargetCard";
import { FireAgeCard } from "./FireAgeCard";
import { FireProgressCard } from "./FireProgressCard";
import { EmptyState } from "./EmptyState";
import type { MetricsPanelProps } from "./types";

export function MetricsPanel({ metrics, isLoading }: MetricsPanelProps) {
  if (isLoading) {
    return null; // LoadingSkeleton will be shown instead
  }

  if (!metrics) {
    return <EmptyState type="no-data" />;
  }

  // Check if there are no investments
  if (metrics.inputs.invested_total === 0) {
    return <EmptyState type="no-investments" />;
  }

  return (
    <div className="space-y-6">
      <FireTargetCard fireTarget={metrics.derived.fire_target} />
      <FireAgeCard timeToFire={metrics.time_to_fire} note={metrics.note} />
      <FireProgressCard fireProgress={metrics.derived.fire_progress} />
    </div>
  );
}
