import { MetricsPanel } from "./MetricsPanel";
import { AIHintAlert } from "./AIHintAlert";
import { PortfolioSummaryList } from "./PortfolioSummaryList";
import type { MetricsPanelProps } from "./types";
import type { AIHintAlertProps } from "./types";
import type { PortfolioSummaryListProps } from "./types";

interface DashboardGridProps {
  metrics: MetricsPanelProps["metrics"];
  isLoading: boolean;
  aiHint: AIHintAlertProps["aiHint"];
  shares: PortfolioSummaryListProps["shares"];
}

export function DashboardGrid({ metrics, isLoading, aiHint, shares }: DashboardGridProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left column */}
      <div className="space-y-6">
        <MetricsPanel metrics={metrics} isLoading={isLoading} />
      </div>

      {/* Right column */}
      <div className="space-y-6">
        <AIHintAlert aiHint={aiHint} isLoading={isLoading} />
        <PortfolioSummaryList shares={shares} isLoading={isLoading} />
      </div>
    </div>
  );
}
