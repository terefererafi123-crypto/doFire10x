import { useDashboard } from "./useDashboard";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardGrid } from "./DashboardGrid";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GlobalErrorProviderWrapper } from "@/components/GlobalErrorProviderWrapper";
import { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DashboardErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    // eslint-disable-next-line no-console
    console.error("Dashboard error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <DashboardHeader />
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {this.state.error?.message || "Wystąpił błąd podczas ładowania dashboardu. Odśwież stronę."}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

function DashboardContentInner() {
  const { metrics, aiHint, isLoading, error } = useDashboard();

  const shares = aiHint?.shares ?? null;

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
        <DashboardGrid metrics={metrics} isLoading={isLoading} aiHint={aiHint} shares={shares} />
      )}
    </div>
  );
}

export function DashboardContent() {
  return (
    <GlobalErrorProviderWrapper>
      <DashboardErrorBoundary>
        <DashboardContentInner />
      </DashboardErrorBoundary>
    </GlobalErrorProviderWrapper>
  );
}
