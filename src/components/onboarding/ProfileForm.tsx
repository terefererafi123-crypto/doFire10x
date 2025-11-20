import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CreateProfileCommand } from "@/types";

export type ProfileFormData = CreateProfileCommand;
export type ProfileFormErrors = Record<string, string>;

interface ProfileFormProps {
  data: ProfileFormData;
  errors: ProfileFormErrors;
  onChange: (field: keyof ProfileFormData, value: unknown) => void;
  onBlur?: (field: keyof ProfileFormData) => void;
}

export function ProfileForm({ data, errors, onChange, onBlur }: ProfileFormProps) {
  const handleChange = (field: keyof ProfileFormData, value: string | number) => {
    if (field === "birth_date") {
      onChange(field, value || undefined);
    } else {
      if (typeof value === "string" && value.trim() === "") {
        // Empty string - set to 0 for number fields (validation will catch if required)
        onChange(field, 0);
      } else {
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        // Only update if we have a valid number
        if (!isNaN(numValue)) {
          onChange(field, numValue);
        }
      }
    }
  };

  const handleBlur = (field: keyof ProfileFormData) => {
    if (onBlur) {
      onBlur(field);
    }
  };

  // Calculate min and max dates for birth_date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = today.toISOString().split("T")[0];
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 120);
  minDate.setHours(0, 0, 0, 0);
  const minDateString = minDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="monthly_expense"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Miesięczne wydatki (PLN)
          <span className="text-destructive ml-1">*</span>
        </label>
        <Input
          id="monthly_expense"
          type="number"
          min="0"
          step="0.01"
          value={data.monthly_expense === undefined || data.monthly_expense === null ? "" : data.monthly_expense}
          onChange={(e) => handleChange("monthly_expense", e.target.value)}
          onBlur={() => handleBlur("monthly_expense")}
          placeholder="0.00"
          className={cn(errors.monthly_expense && "border-destructive")}
          aria-invalid={!!errors.monthly_expense}
          aria-describedby={errors.monthly_expense ? "monthly_expense-error" : undefined}
        />
        {errors.monthly_expense && (
          <p id="monthly_expense-error" className="text-sm text-destructive" role="alert">
            {errors.monthly_expense}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="withdrawal_rate_pct"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Stopa wypłat (%)
          <span className="text-destructive ml-1">*</span>
        </label>
        <Input
          id="withdrawal_rate_pct"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={
            data.withdrawal_rate_pct === undefined || data.withdrawal_rate_pct === null ? "" : data.withdrawal_rate_pct
          }
          onChange={(e) => handleChange("withdrawal_rate_pct", e.target.value)}
          onBlur={() => handleBlur("withdrawal_rate_pct")}
          placeholder="4.00"
          className={cn(errors.withdrawal_rate_pct && "border-destructive")}
          aria-invalid={!!errors.withdrawal_rate_pct}
          aria-describedby={errors.withdrawal_rate_pct ? "withdrawal_rate_pct-error" : undefined}
        />
        {errors.withdrawal_rate_pct && (
          <p id="withdrawal_rate_pct-error" className="text-sm text-destructive" role="alert">
            {errors.withdrawal_rate_pct}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Zalecana wartość: 4% (reguła 4%)</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="expected_return_pct"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Oczekiwany zwrot (%)
          <span className="text-destructive ml-1">*</span>
        </label>
        <Input
          id="expected_return_pct"
          type="number"
          min="-100"
          max="1000"
          step="0.01"
          value={
            data.expected_return_pct === undefined || data.expected_return_pct === null ? "" : data.expected_return_pct
          }
          onChange={(e) => handleChange("expected_return_pct", e.target.value)}
          onBlur={() => handleBlur("expected_return_pct")}
          placeholder="7.00"
          className={cn(errors.expected_return_pct && "border-destructive")}
          aria-invalid={!!errors.expected_return_pct}
          aria-describedby={errors.expected_return_pct ? "expected_return_pct-error" : undefined}
        />
        {errors.expected_return_pct && (
          <p id="expected_return_pct-error" className="text-sm text-destructive" role="alert">
            {errors.expected_return_pct}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Zalecana wartość: 7% (średni zwrot z portfela akcji)</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="birth_date"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Data urodzenia
        </label>
        <Input
          id="birth_date"
          type="date"
          value={data.birth_date || ""}
          onChange={(e) => handleChange("birth_date", e.target.value)}
          onBlur={() => handleBlur("birth_date")}
          max={maxDate}
          min={minDateString}
          className={cn(errors.birth_date && "border-destructive")}
          aria-invalid={!!errors.birth_date}
          aria-describedby={errors.birth_date ? "birth_date-error" : undefined}
        />
        {errors.birth_date && (
          <p id="birth_date-error" className="text-sm text-destructive" role="alert">
            {errors.birth_date}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Opcjonalne - pozwala obliczyć wiek osiągnięcia FIRE</p>
      </div>
    </div>
  );
}
