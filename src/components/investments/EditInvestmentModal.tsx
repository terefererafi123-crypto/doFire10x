import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvestmentForm, type InvestmentFormData, type InvestmentFormErrors } from "@/components/onboarding/InvestmentForm";
import { getAuthToken } from "@/lib/auth/client-helpers";
import type { InvestmentDto, ApiError, UpdateInvestmentCommand } from "@/types";
import { Loader2 } from "lucide-react";

interface EditInvestmentModalProps {
  investment: InvestmentDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditInvestmentModal({
  investment,
  open,
  onOpenChange,
  onSuccess,
}: EditInvestmentModalProps) {
  const [formData, setFormData] = React.useState<InvestmentFormData>({
    type: "etf",
    amount: 0,
    acquired_at: "",
    notes: undefined,
  });
  const [errors, setErrors] = React.useState<InvestmentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Initialize form data when investment changes
  React.useEffect(() => {
    if (investment) {
      setFormData({
        type: investment.type,
        amount: investment.amount,
        acquired_at: investment.acquired_at,
        notes: investment.notes || undefined,
      });
      setErrors({});
      setSubmitError(null);
    }
  }, [investment]);

  const handleChange = (field: keyof InvestmentFormData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const newErrors: InvestmentFormErrors = {};

    if (!formData.type) {
      newErrors.type = "Typ inwestycji jest wymagany";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Kwota musi być większa od zera";
    }

    if (!formData.acquired_at) {
      newErrors.acquired_at = "Data nabycia jest wymagana";
    } else {
      const acquiredDate = new Date(formData.acquired_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (acquiredDate > today) {
        newErrors.acquired_at = "Data nabycia nie może być w przyszłości";
      }
    }

    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = "Notatki nie mogą przekraczać 1000 znaków";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!investment) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setSubmitError("Brak sesji. Zaloguj się ponownie.");
        setIsSubmitting(false);
        return;
      }

      // Build update command with only changed fields
      const updateCommand: UpdateInvestmentCommand = {};
      if (formData.type !== investment.type) {
        updateCommand.type = formData.type;
      }
      if (formData.amount !== investment.amount) {
        updateCommand.amount = formData.amount;
      }
      if (formData.acquired_at !== investment.acquired_at) {
        updateCommand.acquired_at = formData.acquired_at;
      }
      if (formData.notes !== (investment.notes || undefined)) {
        updateCommand.notes = formData.notes || null;
      }

      // Check if there are any changes
      if (Object.keys(updateCommand).length === 0) {
        setSubmitError("Nie wprowadzono żadnych zmian");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/v1/investments/${investment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateCommand),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        
        // Handle field-specific validation errors
        if (error.error.fields) {
          const fieldErrors: InvestmentFormErrors = {};
          Object.entries(error.error.fields).forEach(([field, message]) => {
            fieldErrors[field] = message;
          });
          setErrors(fieldErrors);
          setSubmitError(error.error.message || "Wystąpił błąd walidacji");
        } else {
          setSubmitError(error.error.message || "Nie udało się zaktualizować inwestycji");
        }
        setIsSubmitting(false);
        return;
      }

      // Success - close modal and refresh list
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setSubmitError("Wystąpił błąd podczas aktualizacji inwestycji");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edytuj inwestycję</DialogTitle>
          <DialogDescription>
            Zaktualizuj dane inwestycji. Wszystkie pola są opcjonalne - zmień tylko te, które chcesz zaktualizować.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <InvestmentForm
              data={formData}
              errors={errors}
              onChange={handleChange}
              showErrorSummary={false}
            />
            {submitError && (
              <div className="mt-4 text-sm text-destructive">{submitError}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                "Zapisz zmiany"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

