import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type OnboardingStep = 1 | 2;

interface StepperProps {
  currentStep: OnboardingStep;
  totalSteps?: number;
}

export function Stepper({ currentStep, totalSteps = 2 }: StepperProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium">
          Krok {currentStep}/{totalSteps}
        </span>
        <span className="text-xs">{Math.round(progress)}% ukończone</span>
      </div>
      <Progress value={progress} max={100} />
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className={cn("flex flex-col items-center gap-2", step < totalSteps && "flex-1")}>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-background text-primary",
                  !isCompleted && !isCurrent && "border-muted bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              {step < totalSteps && <div className={cn("h-0.5 w-full", isCompleted ? "bg-primary" : "bg-muted")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
