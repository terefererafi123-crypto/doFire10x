-- ============================================================================
-- Migration: Add CHECK Constraints and Triggers
-- ============================================================================
-- Purpose: Add data validation constraints and automatic timestamp updates
-- 
-- This migration adds:
-- - CHECK constraints for data validation
-- - Function: set_updated_at() for automatic updated_at timestamp updates
-- - Triggers: profiles_updated_at_trigger, investments_updated_at_trigger
--
-- Tables affected: profiles, investments
-- Dependencies: Must run after create_structure.sql
--
-- Note: CHECK constraints are added after table creation to allow
-- inserting data that may not satisfy all constraints during migration.
-- ============================================================================

-- ============================================================================
-- Step 1: Add CHECK constraints to profiles table
-- ============================================================================
-- Purpose: Validate data integrity at the database level
-- ============================================================================

-- constraint: monthly_expense must be non-negative
alter table public.profiles
  add constraint profiles_monthly_expense_non_negative
  check (monthly_expense >= 0);

comment on constraint profiles_monthly_expense_non_negative on public.profiles is 
  'Wydatki miesięczne nie mogą być ujemne (możliwe wartość 0)';

-- constraint: withdrawal_rate_pct must be between 0 and 100
alter table public.profiles
  add constraint profiles_withdrawal_rate_range
  check (withdrawal_rate_pct >= 0 and withdrawal_rate_pct <= 100);

comment on constraint profiles_withdrawal_rate_range on public.profiles is 
  'Stopa wypłaty musi być w zakresie 0-100%';

-- constraint: expected_return_pct must be in realistic range (-100% to 1000%)
alter table public.profiles
  add constraint profiles_expected_return_range
  check (expected_return_pct >= -100 and expected_return_pct <= 1000);

comment on constraint profiles_expected_return_range on public.profiles is 
  'Oczekiwana stopa zwrotu musi być w realistycznym zakresie (-100% do 1000%)';

-- constraint: birth_date must be valid (past date, not older than 120 years)
alter table public.profiles
  add constraint profiles_birth_date_valid
  check (
    birth_date is null or (
      birth_date < current_date and
      birth_date >= current_date - interval '120 years'
    )
  );

comment on constraint profiles_birth_date_valid on public.profiles is 
  'Data urodzenia musi być w przeszłości i nie starsza niż 120 lat (lub NULL)';

-- ============================================================================
-- Step 2: Add CHECK constraints to investments table
-- ============================================================================
-- Purpose: Validate investment data integrity
-- ============================================================================

-- constraint: amount must be positive (greater than 0)
alter table public.investments
  add constraint investments_amount_positive
  check (amount > 0);

comment on constraint investments_amount_positive on public.investments is 
  'Kwota inwestycji musi być większa od zera';

-- constraint: acquired_at cannot be a future date
alter table public.investments
  add constraint investments_acquired_at_not_future
  check (acquired_at <= current_date);

comment on constraint investments_acquired_at_not_future on public.investments is 
  'Data nabycia inwestycji nie może być datą przyszłą';

-- constraint: notes must be either NULL or non-empty text with max 1000 characters
alter table public.investments
  add constraint investments_notes_valid
  check (
    notes is null or (
      btrim(notes) <> '' and
      char_length(notes) <= 1000
    )
  );

comment on constraint investments_notes_valid on public.investments is 
  'Notatki muszą być NULL lub niepustym tekstem o maksymalnej długości 1000 znaków';

-- ============================================================================
-- Step 3: Create function for automatic updated_at timestamp updates
-- ============================================================================
-- Purpose: Automatically update updated_at column on record modification
-- Usage: Called by triggers before UPDATE operations
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is 
  'Funkcja automatycznie aktualizująca kolumnę updated_at przy modyfikacji rekordu';

-- ============================================================================
-- Step 4: Create triggers for automatic updated_at updates
-- ============================================================================
-- Purpose: Automatically update updated_at timestamp when records are modified
-- ============================================================================

-- trigger: update updated_at on profiles table before UPDATE
create trigger profiles_updated_at_trigger
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

comment on trigger profiles_updated_at_trigger on public.profiles is 
  'Trigger automatycznie aktualizujący updated_at w tabeli profiles przed operacją UPDATE';

-- trigger: update updated_at on investments table before UPDATE
create trigger investments_updated_at_trigger
  before update on public.investments
  for each row
  execute function public.set_updated_at();

comment on trigger investments_updated_at_trigger on public.investments is 
  'Trigger automatycznie aktualizujący updated_at w tabeli investments przed operacją UPDATE';

