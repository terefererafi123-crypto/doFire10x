import { useState, useCallback } from "react";
import { useRateLimiter } from "./useRateLimiter";

export interface AuthFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}

export interface AuthFormState<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T;
  errors: AuthFormErrors;
  isLoading: boolean;
  isSuccess?: boolean;
  successMessage?: string;
}

export interface UseAuthFormOptions<T extends Record<string, unknown>> {
  /**
   * Initial form data
   */
  initialData: T;
  /**
   * Custom validators for form fields
   */
  validators?: {
    email?: (email: string) => string | undefined;
    password?: (password: string) => string | undefined;
    confirmPassword?: (password: string, confirmPassword: string) => string | undefined;
  };
  /**
   * Minimum password length
   * @default 6
   */
  minPasswordLength?: number;
  /**
   * Rate limiter cooldown in milliseconds
   * @default 60000
   */
  rateLimitCooldownMs?: number;
}

export interface UseAuthFormReturn<T extends Record<string, unknown>> {
  /**
   * Current form state
   */
  state: AuthFormState<T>;
  /**
   * Update form field value
   */
  setFieldValue: (field: keyof T, value: unknown) => void;
  /**
   * Set field error
   */
  setFieldError: (field: keyof AuthFormErrors, error: string | undefined) => void;
  /**
   * Clear field error
   */
  clearFieldError: (field: keyof AuthFormErrors) => void;
  /**
   * Validate field on blur
   */
  validateField: (field: keyof T) => void;
  /**
   * Validate all fields
   */
  validateAll: () => boolean;
  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;
  /**
   * Set submit error
   */
  setSubmitError: (error: string | undefined) => void;
  /**
   * Set success state
   */
  setSuccess: (isSuccess: boolean, message?: string) => void;
  /**
   * Clear all errors
   */
  clearErrors: () => void;
  /**
   * Reset form to initial state
   */
  reset: () => void;
  /**
   * Rate limiter utilities
   */
  rateLimiter: ReturnType<typeof useRateLimiter>;
}

/**
 * Default email validator
 */
export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Pole e-mail jest wymagane";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Nieprawidłowy format adresu e-mail";
  }

  return undefined;
}

/**
 * Default password validator
 */
export function validatePassword(password: string, minLength = 6): string | undefined {
  if (!password) {
    return "Pole hasła jest wymagane";
  }

  if (password.length < minLength) {
    return `Hasło musi mieć minimum ${minLength} znaków`;
  }

  return undefined;
}

/**
 * Default confirm password validator
 */
export function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) {
    return "Pole potwierdzenia hasła jest wymagane";
  }

  if (password !== confirmPassword) {
    return "Hasła nie są identyczne";
  }

  return undefined;
}

/**
 * Custom hook for managing authentication form state and validation
 *
 * Provides common functionality for login, register, and password reset forms
 *
 * @example
 * ```tsx
 * const form = useAuthForm({
 *   initialData: { email: '', password: '' },
 *   minPasswordLength: 6,
 * });
 *
 * const handleSubmit = async () => {
 *   if (!form.validateAll()) return;
 *   form.setLoading(true);
 *   // ... submit logic
 * };
 * ```
 */
export function useAuthForm<T extends Record<string, unknown>>(options: UseAuthFormOptions<T>): UseAuthFormReturn<T> {
  const { initialData, validators = {}, minPasswordLength = 6, rateLimitCooldownMs = 60000 } = options;

  const rateLimiter = useRateLimiter({ cooldownMs: rateLimitCooldownMs });

  const [state, setState] = useState<AuthFormState<T>>({
    data: initialData,
    errors: {},
    isLoading: false,
    isSuccess: false,
  });

  // Get validator functions (use custom or default)
  const emailValidator = validators.email || validateEmail;
  const passwordValidator = validators.password || ((p: string) => validatePassword(p, minPasswordLength));
  const confirmPasswordValidator = validators.confirmPassword || validateConfirmPassword;

  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      // Clear error for this field when user starts typing
      errors: prev.errors[field as keyof AuthFormErrors] ? { ...prev.errors, [field]: undefined } : prev.errors,
      isSuccess: false,
    }));
  }, []);

  const setFieldError = useCallback((field: keyof AuthFormErrors, error: string | undefined) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof AuthFormErrors) => {
    setState((prev) => {
      const { [field]: _, ...newErrors } = prev.errors;
      return { ...prev, errors: newErrors };
    });
  }, []);

  const validateField = useCallback(
    (field: keyof T) => {
      const fieldName = field as string;
      const value = state.data[field];

      if (fieldName === "email" && typeof value === "string") {
        const error = emailValidator(value);
        if (error) {
          setFieldError("email", error);
        } else {
          clearFieldError("email");
        }
      } else if (fieldName === "password" && typeof value === "string") {
        const error = passwordValidator(value);
        if (error) {
          setFieldError("password", error);
        } else {
          clearFieldError("password");
        }
      } else if (fieldName === "confirmPassword" && typeof value === "string") {
        const password = state.data["password" as keyof T];
        if (typeof password === "string") {
          const error = confirmPasswordValidator(password, value);
          if (error) {
            setFieldError("confirmPassword", error);
          } else {
            clearFieldError("confirmPassword");
          }
        }
      }
    },
    [state.data, emailValidator, passwordValidator, confirmPasswordValidator, setFieldError, clearFieldError]
  );

  const validateAll = useCallback((): boolean => {
    const errors: AuthFormErrors = {};

    // Validate email if present
    if ("email" in state.data) {
      const email = state.data["email" as keyof T];
      if (typeof email === "string") {
        const emailError = emailValidator(email);
        if (emailError) {
          errors.email = emailError;
        }
      }
    }

    // Validate password if present
    if ("password" in state.data) {
      const password = state.data["password" as keyof T];
      if (typeof password === "string") {
        const passwordError = passwordValidator(password);
        if (passwordError) {
          errors.password = passwordError;
        }
      }
    }

    // Validate confirmPassword if present
    if ("confirmPassword" in state.data) {
      const password = state.data["password" as keyof T];
      const confirmPassword = state.data["confirmPassword" as keyof T];
      if (typeof password === "string" && typeof confirmPassword === "string") {
        const confirmPasswordError = confirmPasswordValidator(password, confirmPassword);
        if (confirmPasswordError) {
          errors.confirmPassword = confirmPasswordError;
        }
      }
    }

    setState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [state.data, emailValidator, passwordValidator, confirmPasswordValidator]);

  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  const setSubmitError = useCallback((error: string | undefined) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      errors: { ...prev.errors, submit: error },
    }));
  }, []);

  const setSuccess = useCallback((isSuccess: boolean, message?: string) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isSuccess,
      successMessage: message,
      errors: {},
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, errors: {} }));
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      errors: {},
      isLoading: false,
      isSuccess: false,
    });
    rateLimiter.clearCooldown();
  }, [initialData, rateLimiter]);

  return {
    state,
    setFieldValue,
    setFieldError,
    clearFieldError,
    validateField,
    validateAll,
    setLoading,
    setSubmitError,
    setSuccess,
    clearErrors,
    reset,
    rateLimiter,
  };
}
