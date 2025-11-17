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
import { cn } from "@/lib/utils";
import type { CreateInvestmentCommand, AssetType } from "@/types";

export type InvestmentFormData = CreateInvestmentCommand;
export type InvestmentFormErrors = Record<string, string>;

interface InvestmentFormProps {
  data: InvestmentFormData;
  errors: InvestmentFormErrors;
  onChange: (field: keyof InvestmentFormData, value: unknown) => void;
  onBlur?: (field: keyof InvestmentFormData) => void;
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
      <div className="space-y-2">
        <label
          htmlFor="type"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Typ inwestycji
          <span className="text-destructive ml-1">*</span>
        </label>
        <Select
          value={data.type || ""}
          onValueChange={(value) => handleChange("type", value)}
        >
          <SelectTrigger
            id="type"
            className={cn("w-full", errors.type && "border-destructive")}
            aria-invalid={!!errors.type}
            aria-describedby={errors.type ? "type-error" : undefined}
          >
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
        {errors.type && (
          <p id="type-error" className="text-sm text-destructive" role="alert">
            {errors.type}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="amount"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Kwota (PLN)
          <span className="text-destructive ml-1">*</span>
        </label>
        <Input
          id="amount"
          type="number"
          min="0.01"
          max="999999999999.99"
          step="0.01"
          value={data.amount === undefined || data.amount === null ? "" : data.amount}
          onChange={(e) => handleChange("amount", e.target.value)}
          onBlur={() => handleBlur("amount")}
          placeholder="0.00"
          className={cn(errors.amount && "border-destructive")}
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? "amount-error" : undefined}
        />
        {errors.amount && (
          <p
            id="amount-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.amount}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="acquired_at"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Data nabycia
          <span className="text-destructive ml-1">*</span>
        </label>
        <Input
          id="acquired_at"
          type="date"
          value={data.acquired_at || ""}
          onChange={(e) => handleChange("acquired_at", e.target.value)}
          onBlur={() => handleBlur("acquired_at")}
          max={maxDate}
          className={cn(errors.acquired_at && "border-destructive")}
          aria-invalid={!!errors.acquired_at}
          aria-describedby={
            errors.acquired_at ? "acquired_at-error" : undefined
          }
        />
        {errors.acquired_at && (
          <p
            id="acquired_at-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.acquired_at}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="notes"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Notatki
          <span className="text-muted-foreground ml-1 text-xs">(opcjonalne)</span>
        </label>
        <Textarea
          id="notes"
          value={data.notes || ""}
          onChange={(e) =>
            handleChange("notes", e.target.value || null)
          }
          onBlur={() => handleBlur("notes")}
          placeholder="Dodatkowe informacje o inwestycji..."
          maxLength={1000}
          rows={3}
          className={cn(errors.notes && "border-destructive")}
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? "notes-error" : undefined}
        />
        {errors.notes && (
          <p id="notes-error" className="text-sm text-destructive" role="alert">
            {errors.notes}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Maksymalnie 1000 znaków
        </p>
      </div>
    </div>
  );
}

