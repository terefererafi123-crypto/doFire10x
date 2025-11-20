
├── DashboardErrorBoundary (class component)
│   └── DashboardContentInner
│       │
│       ├── useDashboard (hook)
│       │   ├── getAuthToken (from @/lib/auth/client-helpers)
│       │   ├── useGlobalError (from @/lib/contexts/GlobalErrorContext)
│       │   └── shouldHandleGlobally (from @/lib/utils/api-error-handler)
│       │
│       ├── DashboardHeader
│       │   └── (no dependencies - pure component)
│       │
│       ├── Alert (from @/components/ui/alert)
│       │   └── AlertDescription
│       │
│       ├── LoadingSkeleton
│       │   ├── Skeleton (from @/components/ui/skeleton)
│       │   └── Card (from @/components/ui/card)
│       │
│       └── DashboardGrid
│           │
│           ├── MetricsPanel
│           │   ├── FireTargetCard
│           │   │   ├── Card (from @/components/ui/card)
│           │   │   └── formatCurrency (from @/lib/utils/formatting)
│           │   │
│           │   ├── FireAgeCard
│           │   │   ├── Card (from @/components/ui/card)
│           │   │   └── formatYearsAndMonths (from @/lib/utils/formatting)
│           │   │
│           │   ├── FireProgressCard
│           │   │   ├── Card (from @/components/ui/card)
│           │   │   ├── Progress (from @/components/ui/progress)
│           │   │   └── formatPercent (from @/lib/utils/formatting)
│           │   │
│           │   └── EmptyState
│           │       ├── Card (from @/components/ui/card)
│           │       └── Button (from @/components/ui/button)
│           │
│           ├── RecalculateButton
│           │   └── Button (from @/components/ui/button)
│           │
│           ├── AIHintAlert
│           │   └── Alert (from @/components/ui/alert)
│           │
│           └── PortfolioSummaryList
│               ├── Card (from @/components/ui/card)
│               └── formatPercent (from @/lib/utils/formatting)
│
└── UI Components (shared)
    ├── alert.tsx
    │   └── cn (from @/lib/utils)
    │
    ├── button.tsx
    │   └── cn (from @/lib/utils)
    │
    ├── card.tsx
    │   └── cn (from @/lib/utils)
    │
    ├── progress.tsx
    │   └── cn (from @/lib/utils)
    │
    └── skeleton.tsx
        └── cn (from @/lib/utils)