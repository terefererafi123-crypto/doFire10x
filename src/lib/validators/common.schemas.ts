import { z } from "zod";

/**
 * Common validation schemas reused across multiple forms
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Pole e-mail jest wymagane")
  .email("Nieprawidłowy format adresu e-mail");

export const passwordSchema = (minLength: number = 6) =>
  z
    .string()
    .min(1, "Pole hasła jest wymagane")
    .min(minLength, `Hasło musi mieć minimum ${minLength} znaków`);

