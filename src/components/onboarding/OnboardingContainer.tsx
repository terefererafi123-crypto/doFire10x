import * as React from "react";
import { Stepper, type OnboardingStep } from "./Stepper";
import { ProfileForm } from "./ProfileForm";
import { InvestmentForm } from "./InvestmentForm";
import { NavigationButtons } from "./NavigationButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/lib/hooks/useOnboardingForm";
import { useOnboardingApi } from "@/lib/hooks/useOnboardingApi";
import { mapApiErrorsToFormErrors } from "@/lib/utils/error-mapper";
import type {
  CreateProfileCommand,
  CreateInvestmentCommand,
  ApiError,
} from "@/types";

type ProfileFormData = CreateProfileCommand;
type InvestmentFormData = CreateInvestmentCommand;
type ProfileFormErrors = Record<string, string>;
type InvestmentFormErrors = Record<string, string>;

interface OnboardingState {
  currentStep: OnboardingStep;
  profileData: ProfileFormData;
  investmentData: InvestmentFormData;
  profileErrors: ProfileFormErrors;
  investmentErrors: InvestmentFormErrors;
  isLoading: boolean;
  apiError: string | null;
}

export function OnboardingContainer() {
  const { validateProfileForm, validateInvestmentForm } = useOnboardingForm();
  const { createProfile, createInvestment } = useOnboardingApi();

  const [state, setState] = React.useState<OnboardingState>({
    currentStep: 1,
    profileData: {
      monthly_expense: 0,
      withdrawal_rate_pct: 4,
      expected_return_pct: 7,
      birth_date: undefined,
    },
    investmentData: {
      type: "etf",
      amount: 0,
      acquired_at: new Date().toISOString().split("T")[0],
      notes: undefined,
    },
    profileErrors: {},
    investmentErrors: {},
    isLoading: false,
    apiError: null,
  });

  // Clear API error when user interacts with form
  const clearApiError = React.useCallback(() => {
    setState((prev) => ({ ...prev, apiError: null }));
  }, []);

  // Handle profile form field changes
  const handleProfileChange = React.useCallback(
    (field: keyof ProfileFormData, value: unknown) => {
      clearApiError();
      setState((prev) => ({
        ...prev,
        profileData: { ...prev.profileData, [field]: value },
        profileErrors: { ...prev.profileErrors, [field]: undefined },
      }));
    },
    [clearApiError]
  );

  // Handle investment form field changes
  const handleInvestmentChange = React.useCallback(
    (field: keyof InvestmentFormData, value: unknown) => {
      clearApiError();
      setState((prev) => ({
        ...prev,
        investmentData: { ...prev.investmentData, [field]: value },
        investmentErrors: { ...prev.investmentErrors, [field]: undefined },
      }));
    },
    [clearApiError]
  );

  // Handle profile form field blur (validation)
  const handleProfileBlur = React.useCallback(
    (field: keyof ProfileFormData) => {
      const errors = validateProfileForm(state.profileData);
      if (errors[field]) {
        setState((prev) => ({
          ...prev,
          profileErrors: { ...prev.profileErrors, [field]: errors[field] },
        }));
      }
    },
    [state.profileData, validateProfileForm]
  );

  // Handle investment form field blur (validation)
  const handleInvestmentBlur = React.useCallback(
    (field: keyof InvestmentFormData) => {
      const errors = validateInvestmentForm(state.investmentData);
      if (errors[field]) {
        setState((prev) => ({
          ...prev,
          investmentErrors: {
            ...prev.investmentErrors,
            [field]: errors[field],
          },
        }));
      }
    },
    [state.investmentData, validateInvestmentForm]
  );

  // Check if profile form is valid
  const isProfileFormValid = React.useMemo(() => {
    const errors = validateProfileForm(state.profileData);
    return Object.keys(errors).length === 0;
  }, [state.profileData, validateProfileForm]);

  // Check if investment form is valid
  const isInvestmentFormValid = React.useMemo(() => {
    const errors = validateInvestmentForm(state.investmentData);
    return Object.keys(errors).length === 0;
  }, [state.investmentData, validateInvestmentForm]);

  // Handle back button
  const handleBack = React.useCallback(() => {
    if (state.currentStep === 2) {
      setState((prev) => ({ ...prev, currentStep: 1 }));
    }
  }, [state.currentStep]);

  // Handle next button (step 1 -> step 2)
  const handleNext = React.useCallback(async () => {
    if (state.currentStep === 1) {
      // Validate profile form
      const errors = validateProfileForm(state.profileData);
      if (Object.keys(errors).length > 0) {
        setState((prev) => ({ ...prev, profileErrors: errors }));
        return;
      }

      // Save profile
      setState((prev) => ({ ...prev, isLoading: true, apiError: null }));

      try {
        await createProfile(state.profileData);
        // Success - move to step 2
        setState((prev) => ({
          ...prev,
          currentStep: 2,
          isLoading: false,
          apiError: null,
        }));
      } catch (error) {
        // Handle network errors
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError: "Brak połączenia z serwerem. Sprawdź połączenie internetowe.",
          }));
          return;
        }

        const apiError = error as ApiError;

        if (apiError.error?.code === "bad_request" && apiError.error?.fields) {
          // Validation errors from API
          const formErrors = mapApiErrorsToFormErrors(apiError.error.fields);
          setState((prev) => ({
            ...prev,
            profileErrors: formErrors,
            isLoading: false,
            apiError: "Popraw błędy w formularzu",
          }));
        } else if (apiError.error?.code === "unauthorized") {
          // Unauthorized - redirect to login
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError: "Zaloguj ponownie",
          }));
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else if (apiError.error?.code === "conflict") {
          // Profile already exists - redirect to dashboard
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError: "Profil już istnieje",
          }));
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        } else {
          // Other errors
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError:
              apiError.error?.message ||
              "Wystąpił błąd serwera. Spróbuj ponownie.",
          }));
        }
      }
    } else if (state.currentStep === 2) {
      // Validate investment form
      const errors = validateInvestmentForm(state.investmentData);
      if (Object.keys(errors).length > 0) {
        setState((prev) => ({ ...prev, investmentErrors: errors }));
        return;
      }

      // Save investment
      setState((prev) => ({ ...prev, isLoading: true, apiError: null }));

      try {
        await createInvestment(state.investmentData);
        // Success - redirect to dashboard
        window.location.href = "/dashboard";
      } catch (error) {
        // Handle network errors
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError: "Brak połączenia z serwerem. Sprawdź połączenie internetowe.",
          }));
          return;
        }

        const apiError = error as ApiError;

        if (apiError.error?.code === "bad_request" && apiError.error?.fields) {
          // Validation errors from API
          const formErrors = mapApiErrorsToFormErrors(apiError.error.fields);
          setState((prev) => ({
            ...prev,
            investmentErrors: formErrors,
            isLoading: false,
            apiError: "Popraw błędy w formularzu",
          }));
        } else if (apiError.error?.code === "unauthorized") {
          // Unauthorized - redirect to login
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError: "Zaloguj ponownie",
          }));
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else {
          // Other errors
          setState((prev) => ({
            ...prev,
            isLoading: false,
            apiError:
              apiError.error?.message ||
              "Wystąpił błąd serwera. Spróbuj ponownie.",
          }));
        }
      }
    }
  }, [
    state.currentStep,
    state.profileData,
    state.investmentData,
    validateProfileForm,
    validateInvestmentForm,
    createProfile,
    createInvestment,
  ]);


  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Witaj w DoFIRE</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Skonfiguruj swój profil finansowy i dodaj pierwszą inwestycję
          </p>
        </div>

        <Card>
          <CardHeader>
            <Stepper currentStep={state.currentStep} />
          </CardHeader>
          <CardContent className="space-y-6">
            {state.apiError && (
              <Alert variant="destructive">
                <AlertDescription>{state.apiError}</AlertDescription>
              </Alert>
            )}

            {state.currentStep === 1 ? (
              <div>
                <CardTitle className="mb-4">Krok 1: Profil finansowy</CardTitle>
                <ProfileForm
                  data={state.profileData}
                  errors={state.profileErrors}
                  onChange={handleProfileChange}
                  onBlur={handleProfileBlur}
                />
              </div>
            ) : (
              <div>
                <CardTitle className="mb-4">Krok 2: Pierwsza inwestycja</CardTitle>
                <InvestmentForm
                  data={state.investmentData}
                  errors={state.investmentErrors}
                  onChange={handleInvestmentChange}
                  onBlur={handleInvestmentBlur}
                />
              </div>
            )}

            <NavigationButtons
              currentStep={state.currentStep}
              isLoading={state.isLoading}
              onBack={handleBack}
              onNext={handleNext}
              isFormValid={
                state.currentStep === 1
                  ? isProfileFormValid
                  : isInvestmentFormValid
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

