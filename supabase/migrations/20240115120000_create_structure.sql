-- ============================================================================
-- Migration: Create Database Structure
-- ============================================================================
-- Purpose: Create core database structure for DoFIRE application
-- 
-- This migration creates:
-- - ENUM type: asset_type
-- - Tables: profiles, investments
-- - Primary keys and foreign keys
-- - Indexes for performance optimization
--
-- Tables affected: profiles, investments
-- Dependencies: auth.users (managed by Supabase Auth)
--
-- Note: RLS is enabled on tables but policies are added in a later migration.
-- Tables will be inaccessible until RLS policies are created.
-- ============================================================================

-- ============================================================================
-- Step 1: Create ENUM type for asset types
-- ============================================================================
-- Purpose: Define allowed asset types for investments
-- Values: etf, bond, stock, cash
-- ============================================================================

create type asset_type as enum (
  'etf',
  'bond',
  'stock',
  'cash'
);

comment on type asset_type is 'Typ aktywa inwestycyjnego: etf (fundusz ETF), bond (obligacja), stock (akcja), cash (gotówka)';

-- ============================================================================
-- Step 2: Create profiles table
-- ============================================================================
-- Purpose: Store user profile data required for FIRE calculations
-- Relationship: 1:1 with auth.users
-- Dependencies: auth.users (must exist)
-- ============================================================================

create table public.profiles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  monthly_expense numeric(16,2) not null default 0.00,
  withdrawal_rate_pct numeric(5,2) not null default 4.00,
  expected_return_pct numeric(5,2) not null default 7.00,
  birth_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- primary key constraint
  constraint profiles_pkey primary key (id),
  
  -- foreign key to auth.users with cascade delete
  constraint profiles_user_id_fkey foreign key (user_id)
    references auth.users(id)
    on delete cascade,
  
  -- unique constraint to ensure 1:1 relationship with auth.users
  constraint profiles_user_id_key unique (user_id)
);

comment on table public.profiles is 'Profil użytkownika zawierający dane potrzebne do obliczeń FIRE';
comment on column public.profiles.id is 'Unikalny identyfikator profilu (UUID)';
comment on column public.profiles.user_id is 'Identyfikator użytkownika z auth.users (relacja 1:1)';
comment on column public.profiles.monthly_expense is 'Miesięczne wydatki użytkownika w PLN (domyślnie 0.00)';
comment on column public.profiles.withdrawal_rate_pct is 'Roczna stopa wypłaty w procentach (domyślnie 4.00%)';
comment on column public.profiles.expected_return_pct is 'Oczekiwana roczna stopa zwrotu w procentach (domyślnie 7.00%)';
comment on column public.profiles.birth_date is 'Data urodzenia użytkownika (opcjonalna, używana do obliczenia wieku)';
comment on column public.profiles.created_at is 'Data i czas utworzenia rekordu';
comment on column public.profiles.updated_at is 'Data i czas ostatniej aktualizacji rekordu';

-- enable row level security on profiles table
-- note: policies will be added in a later migration
alter table public.profiles enable row level security;

-- ============================================================================
-- Step 3: Create investments table
-- ============================================================================
-- Purpose: Store user investment records
-- Relationship: 1:N with auth.users
-- Dependencies: auth.users (must exist), asset_type ENUM (created above)
-- ============================================================================

create table public.investments (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  type asset_type not null,
  amount numeric(16,2) not null,
  acquired_at date not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- primary key constraint
  constraint investments_pkey primary key (id),
  
  -- foreign key to auth.users with cascade delete
  constraint investments_user_id_fkey foreign key (user_id)
    references auth.users(id)
    on delete cascade
);

comment on table public.investments is 'Rejestr inwestycji użytkownika';
comment on column public.investments.id is 'Unikalny identyfikator inwestycji (UUID)';
comment on column public.investments.user_id is 'Identyfikator użytkownika z auth.users (relacja 1:N)';
comment on column public.investments.type is 'Typ aktywa (etf, bond, stock, cash)';
comment on column public.investments.amount is 'Kwota inwestycji w PLN (musi być > 0)';
comment on column public.investments.acquired_at is 'Data nabycia inwestycji (nie może być przyszła)';
comment on column public.investments.notes is 'Opcjonalne notatki (maksymalnie 1000 znaków)';
comment on column public.investments.created_at is 'Data i czas utworzenia rekordu';
comment on column public.investments.updated_at is 'Data i czas ostatniej aktualizacji rekordu';

-- enable row level security on investments table
-- note: policies will be added in a later migration
alter table public.investments enable row level security;

-- ============================================================================
-- Step 4: Create indexes for performance optimization
-- ============================================================================
-- Purpose: Improve query performance for common access patterns
-- Indexes are critical for RLS queries filtering by user_id
-- ============================================================================

-- index on profiles.user_id for fast lookups (used by RLS and joins)
create index profiles_user_id_idx on public.profiles(user_id);

-- index on investments.user_id for fast lookups (used by RLS and joins)
create index investments_user_id_idx on public.investments(user_id);

-- index on investments.acquired_at for sorting and filtering by date
create index investments_acquired_at_idx on public.investments(acquired_at);

-- index on investments.type for aggregation queries (used in v_investments_agg view)
create index investments_type_idx on public.investments(type);

comment on index public.profiles_user_id_idx is 'Indeks dla szybkiego wyszukiwania po user_id (krytyczny dla wydajności RLS)';
comment on index public.investments_user_id_idx is 'Indeks dla szybkiego wyszukiwania po user_id (krytyczny dla wydajności RLS)';
comment on index public.investments_acquired_at_idx is 'Indeks dla sortowania i filtrowania inwestycji po dacie nabycia';
comment on index public.investments_type_idx is 'Indeks dla agregacji inwestycji po typie aktywa';

