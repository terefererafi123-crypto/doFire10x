// Dashboard ViewModel types
import type { MetricsDto, AiHintDto, ApiError } from "@/types";

/**
 * State of the Dashboard component
 */
export interface DashboardState {
  metrics: MetricsDto | null;
  aiHint: AiHintDto | null;
  isLoading: boolean;
  error: ApiError | null;
}

/**
 * Props for MetricsPanel component
 */
export interface MetricsPanelProps {
  metrics: MetricsDto | null;
  isLoading: boolean;
}

/**
 * Props for FireTargetCard component
 */
export interface FireTargetCardProps {
  fireTarget: number;
}

/**
 * Props for FireAgeCard component
 */
export interface FireAgeCardProps {
  timeToFire: MetricsDto["time_to_fire"];
  note?: string;
}

/**
 * Props for FireProgressCard component
 */
export interface FireProgressCardProps {
  fireProgress: number; // value 0-1
}

/**
 * Props for AIHintAlert component
 */
export interface AIHintAlertProps {
  aiHint: AiHintDto | null;
  isLoading: boolean;
}

/**
 * Props for PortfolioSummaryList component
 */
export interface PortfolioSummaryListProps {
  shares: AiHintDto["shares"] | null;
  isLoading: boolean;
}

/**
 * Props for EmptyState component
 */
export interface EmptyStateProps {
  type: "no-profile" | "no-investments" | "no-data";
}

/**
 * Props for RecalculateButton component
 */
export interface RecalculateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

