import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/FormField";
import { FormErrorSummary } from "@/components/FormErrorSummary";
import type { CreateInvestmentCommand, AssetType } from "@/types";

export type InvestmentFormData = CreateInvestmentCommand;
export type InvestmentFormErrors = Record<string, string>;

interface InvestmentFormProps {
  data: InvestmentFormData;
  errors: InvestmentFormErrors;
  onChange: (field: keyof InvestmentFormData, value: unknown) => void;
  onBlur?: (field: keyof InvestmentFormData) => void;
  showErrorSummary?: boolean;
}

const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: "etf", label: "ETF" },
  { value: "bond", label: "Obligacja" },
  { value: "stock", label: "Akcja" },
  { value: "cash", label: "Gotówka" },
];

export function InvestmentForm({
  data,
  errors,
  onChange,
  onBlur,
  showErrorSummary = false,
}: InvestmentFormProps) {
  const handleChange = (
    field: keyof InvestmentFormData,
    value: string | number | null
  ) => {
    if (field === "notes") {
      onChange(field, value || undefined);
    } else if (field === "type") {
      onChange(field, value as AssetType);
    } else if (field === "acquired_at") {
      onChange(field, value as string);
    } else {
      if (typeof value === "string" && value.trim() === "") {
        // Empty string - set to 0 for amount field (validation will catch if required)
        onChange(field, 0);
      } else {
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        onChange(field, isNaN(numValue) ? 0 : numValue);
      }
    }
  };

  const handleBlur = (field: keyof InvestmentFormData) => {
    if (onBlur) {
      onBlur(field);
    }
  };

  // Calculate max date for acquired_at (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = today.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {showErrorSummary && <FormErrorSummary errors={errors} />}

      <FormField
        label="Typ inwestycji"
        name="type"
        required
        error={errors.type}
      >
        <Select
          value={data.type || ""}
          onValueChange={(value) => handleChange("type", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Wybierz typ inwestycji" />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Kwota (PLN)"
        name="amount"
        required
        error={errors.amount}
      >
        <Input
          type="number"
          min="0.01"
          max="999999999999.99"
          step="0.01"
          value={data.amount === undefined || data.amount === null ? "" : data.amount}
          onChange={(e) => handleChange("amount", e.target.value)}
          onBlur={() => handleBlur("amount")}
          placeholder="0.00"
        />
      </FormField>

      <FormField
        label="Data nabycia"
        name="acquired_at"
        required
        error={errors.acquired_at}
      >
        <Input
          type="date"
          value={data.acquired_at || ""}
          onChange={(e) => handleChange("acquired_at", e.target.value)}
          onBlur={() => handleBlur("acquired_at")}
          max={maxDate}
        />
      </FormField>

      <FormField
        label="Notatki"
        name="notes"
        error={errors.notes}
        helperText="Maksymalnie 1000 znaków"
      >
        <Textarea
          value={data.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value || null)}
          onBlur={() => handleBlur("notes")}
          placeholder="Dodatkowe informacje o inwestycji..."
          maxLength={1000}
          rows={3}
        />
      </FormField>
    </div>
  );
}

