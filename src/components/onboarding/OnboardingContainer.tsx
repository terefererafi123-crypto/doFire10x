import * as React from "react";
import { Stepper, type OnboardingStep } from "./Stepper";
import { ProfileForm } from "./ProfileForm";
import { InvestmentForm } from "./InvestmentForm";
import { NavigationButtons } from "./NavigationButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/lib/hooks/useOnboardingForm";
import { useOnboardingApi } from "@/lib/hooks/useOnboardingApi";
import { useApiErrorHandler } from "@/lib/hooks/useApiErrorHandler";
import { investmentErrorMessages } from "@/lib/utils/error-mapper";
import { handleOnboardingError } from "@/lib/utils/onboarding-error-handler";
import type {
  CreateProfileCommand,
  CreateInvestmentCommand,
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
  const { createProfile, createInvestment, getProfile, updateProfile, hasInvestments } = useOnboardingApi();
  const investmentErrorHandler = useApiErrorHandler(investmentErrorMessages);
  
  // Track if we're editing an existing profile
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);

  // Get initial step from URL parameter
  const getInitialStep = (): OnboardingStep => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get("step");
      if (stepParam === "2") {
        return 2;
      }
    }
    return 1;
  };

  const [state, setState] = React.useState<OnboardingState>({
    currentStep: getInitialStep(),
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

  // Load existing profile on mount (if on step 1)
  const profileLoadedRef = React.useRef(false);
  React.useEffect(() => {
    const loadExistingProfile = async () => {
      // Only load once, and only if on step 1
      if (profileLoadedRef.current || state.currentStep !== 1) {
        return;
      }
      
      profileLoadedRef.current = true;
      
      try {
        const profile = await getProfile();
        if (profile) {
          // Profile exists - load it into form and set editing mode
          setIsEditingProfile(true);
          setState((prev) => ({
            ...prev,
            profileData: {
              monthly_expense: profile.monthly_expense,
              withdrawal_rate_pct: profile.withdrawal_rate_pct,
              expected_return_pct: profile.expected_return_pct,
              birth_date: profile.birth_date || undefined,
            },
          }));
        }
      } catch (error) {
        // If error is 401/403, GlobalErrorBanner will handle it
        // For other errors, just log and continue (user can still create profile)
        console.error("Error loading existing profile:", error);
      }
    };
    
    loadExistingProfile();
  }, [state.currentStep, getProfile]); // Only run when currentStep changes to 1

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
      investmentErrorHandler.clearFieldError(field);
      setState((prev) => ({
        ...prev,
        investmentData: { ...prev.investmentData, [field]: value },
        investmentErrors: { ...prev.investmentErrors, [field]: undefined },
      }));
    },
    [clearApiError, investmentErrorHandler]
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

      // Save profile (create or update)
      setState((prev) => ({ ...prev, isLoading: true, apiError: null }));

      try {
        if (isEditingProfile) {
          // Update existing profile
          await updateProfile(state.profileData);
          // Check if user already has investments
          const userHasInvestments = await hasInvestments();
          if (userHasInvestments) {
            // User already has investments - redirect to dashboard
            window.location.href = "/dashboard";
            return;
          }
          // Success - move to step 2 (user needs to add first investment)
          setState((prev) => ({
            ...prev,
            currentStep: 2,
            isLoading: false,
            apiError: null,
          }));
        } else {
          // Create new profile
          await createProfile(state.profileData);
          // Success - move to step 2 (user needs to add first investment)
          setState((prev) => ({
            ...prev,
            currentStep: 2,
            isLoading: false,
            apiError: null,
          }));
        }
      } catch (error) {
        handleOnboardingError({
          error,
          onNetworkError: (message) => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: message,
            }));
          },
          onValidationError: (errors, message) => {
            setState((prev) => ({
              ...prev,
              profileErrors: errors,
              isLoading: false,
              apiError: message,
            }));
          },
          onAuthError: () => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: null, // Don't show local error, GlobalErrorBanner will handle it
            }));
          },
          onConflictError: (message) => {
            setIsEditingProfile(true);
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: message,
            }));
          },
          onOtherError: (message) => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: message,
            }));
          },
        });
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
        // Use useApiErrorHandler for investment form errors
        if (error && typeof error === "object" && "error" in error) {
          investmentErrorHandler.handleApiError(error as Parameters<typeof investmentErrorHandler.handleApiError>[0]);
        }

        handleOnboardingError({
          error,
          onNetworkError: (message) => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: message,
            }));
          },
          onValidationError: (errors, message) => {
            setState((prev) => ({
              ...prev,
              investmentErrors: investmentErrorHandler.fieldErrors,
              isLoading: false,
              apiError: message,
            }));
          },
          onAuthError: () => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: null, // Don't show local error, GlobalErrorBanner will handle it
            }));
          },
          onConflictError: (message) => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: message,
            }));
          },
          onOtherError: (message) => {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              apiError: message,
            }));
          },
        });
      }
    }
  }, [
    state.currentStep,
    state.profileData,
    state.investmentData,
    isEditingProfile,
    validateProfileForm,
    validateInvestmentForm,
    createProfile,
    updateProfile,
    createInvestment,
    hasInvestments,
    investmentErrorHandler,
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
                  errors={investmentErrorHandler.fieldErrors}
                  onChange={handleInvestmentChange}
                  onBlur={handleInvestmentBlur}
                  showErrorSummary={Object.keys(investmentErrorHandler.fieldErrors).length > 0}
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
              isEditingProfile={isEditingProfile}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

