import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AIHintAlertProps } from "./types";

export function AIHintAlert({ aiHint, isLoading }: AIHintAlertProps) {
  if (isLoading) {
    return (
      <Alert>
        <AlertTitle>Analiza portfela</AlertTitle>
        <AlertDescription>Ładowanie analizy...</AlertDescription>
      </Alert>
    );
  }

  if (!aiHint || !aiHint.hint) {
    return null;
  }

  return (
    <Alert>
      <AlertTitle>Analiza portfela</AlertTitle>
      <AlertDescription>{aiHint.hint}</AlertDescription>
    </Alert>
  );
}
