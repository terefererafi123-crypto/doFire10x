import * as React from "react";
import { Button } from "@/components/ui/button";
import type { OnboardingStep } from "./Stepper";

interface NavigationButtonsProps {
  currentStep: OnboardingStep;
  isLoading: boolean;
  onBack: () => void;
  onNext: () => void;
  isFormValid: boolean;
  isEditingProfile?: boolean;
}

export function NavigationButtons({
  currentStep,
  isLoading,
  onBack,
  onNext,
  isFormValid,
  isEditingProfile = false,
}: NavigationButtonsProps) {
  const isNextDisabled = isLoading || !isFormValid;

  return (
    <div className="flex items-center justify-between gap-4 pt-6">
      {currentStep === 2 && (
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="flex-1">
          Wstecz
        </Button>
      )}

      <Button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled}
        className={currentStep === 2 ? "flex-1" : "ml-auto"}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <span className="mr-2" aria-hidden="true">
              {currentStep === 1 ? "Zapisywanie..." : "Zapisywanie..."}
            </span>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span className="sr-only">{currentStep === 1 ? "Zapisywanie profilu" : "Zapisywanie inwestycji"}</span>
          </>
        ) : currentStep === 1 ? (
          isEditingProfile ? (
            "Zapisz zmiany"
          ) : (
            "Dalej"
          )
        ) : (
          "Zakończ i przejdź do dashboardu"
        )}
      </Button>
    </div>
  );
}
