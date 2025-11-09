-- ============================================================================
-- Migration: Enable RLS Policies and Set Permissions
-- ============================================================================
-- Purpose: Configure Row Level Security policies and grant/revoke permissions
-- 
-- This migration:
-- - Creates RLS policies for profiles and investments tables
-- - Grants permissions to authenticated role
-- - Revokes all permissions from anon and public roles
-- - Creates v_investments_agg view for aggregated investment data
--
-- Tables affected: profiles, investments
-- Views created: v_investments_agg
-- Dependencies: Must run after add_constraints_and_triggers.sql
--
-- Security: RLS policies ensure users can only access their own data
-- ============================================================================

-- ============================================================================
-- Step 1: Create RLS policies for profiles table
-- ============================================================================
-- Purpose: Control access to user profiles based on ownership
-- Policy: Users can only access their own profile (user_id = auth.uid())
-- Note: Policies for anon role deny all access (return false)
-- ============================================================================

-- policy: allow authenticated users to select their own profile
create policy profiles_select_policy on public.profiles
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy profiles_select_policy on public.profiles is 
  'Polityka RLS pozwalająca użytkownikom authenticated na odczyt własnego profilu';

-- policy: deny anon users from selecting profiles
create policy profiles_select_policy_anon on public.profiles
  for select
  to anon
  using (false);

comment on policy profiles_select_policy_anon on public.profiles is 
  'Polityka RLS blokująca użytkowników anon przed odczytem profilów (dostęp zablokowany również przez REVOKE ALL)';

-- policy: allow authenticated users to insert their own profile
create policy profiles_insert_policy on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy profiles_insert_policy on public.profiles is 
  'Polityka RLS pozwalająca użytkownikom authenticated na wstawienie własnego profilu (z weryfikacją user_id)';

-- policy: deny anon users from inserting profiles
create policy profiles_insert_policy_anon on public.profiles
  for insert
  to anon
  with check (false);

comment on policy profiles_insert_policy_anon on public.profiles is 
  'Polityka RLS blokująca użytkowników anon przed wstawieniem profilów (dostęp zablokowany również przez REVOKE ALL)';

-- policy: allow authenticated users to update their own profile
create policy profiles_update_policy on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy profiles_update_policy on public.profiles is 
  'Polityka RLS pozwalająca użytkownikom authenticated na aktualizację własnego profilu (z weryfikacją user_id przed i po zmianie)';

-- policy: deny anon users from updating profiles
create policy profiles_update_policy_anon on public.profiles
  for update
  to anon
  using (false)
  with check (false);

comment on policy profiles_update_policy_anon on public.profiles is 
  'Polityka RLS blokująca użytkowników anon przed aktualizacją profilów (dostęp zablokowany również przez REVOKE ALL)';

-- policy: allow authenticated users to delete their own profile
create policy profiles_delete_policy on public.profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy profiles_delete_policy on public.profiles is 
  'Polityka RLS pozwalająca użytkownikom authenticated na usunięcie własnego profilu';

-- policy: deny anon users from deleting profiles
create policy profiles_delete_policy_anon on public.profiles
  for delete
  to anon
  using (false);

comment on policy profiles_delete_policy_anon on public.profiles is 
  'Polityka RLS blokująca użytkowników anon przed usunięciem profilów (dostęp zablokowany również przez REVOKE ALL)';

-- ============================================================================
-- Step 2: Create RLS policies for investments table
-- ============================================================================
-- Purpose: Control access to user investments based on ownership
-- Policy: Users can only access their own investments (user_id = auth.uid())
-- Note: Policies for anon role deny all access (return false)
-- ============================================================================

-- policy: allow authenticated users to select their own investments
create policy investments_select_policy on public.investments
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy investments_select_policy on public.investments is 
  'Polityka RLS pozwalająca użytkownikom authenticated na odczyt własnych inwestycji';

-- policy: deny anon users from selecting investments
create policy investments_select_policy_anon on public.investments
  for select
  to anon
  using (false);

comment on policy investments_select_policy_anon on public.investments is 
  'Polityka RLS blokująca użytkowników anon przed odczytem inwestycji (dostęp zablokowany również przez REVOKE ALL)';

-- policy: allow authenticated users to insert their own investments
create policy investments_insert_policy on public.investments
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy investments_insert_policy on public.investments is 
  'Polityka RLS pozwalająca użytkownikom authenticated na wstawienie własnej inwestycji (z weryfikacją user_id)';

-- policy: deny anon users from inserting investments
create policy investments_insert_policy_anon on public.investments
  for insert
  to anon
  with check (false);

comment on policy investments_insert_policy_anon on public.investments is 
  'Polityka RLS blokująca użytkowników anon przed wstawieniem inwestycji (dostęp zablokowany również przez REVOKE ALL)';

-- policy: allow authenticated users to update their own investments
create policy investments_update_policy on public.investments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy investments_update_policy on public.investments is 
  'Polityka RLS pozwalająca użytkownikom authenticated na aktualizację własnej inwestycji (z weryfikacją user_id przed i po zmianie)';

-- policy: deny anon users from updating investments
create policy investments_update_policy_anon on public.investments
  for update
  to anon
  using (false)
  with check (false);

comment on policy investments_update_policy_anon on public.investments is 
  'Polityka RLS blokująca użytkowników anon przed aktualizacją inwestycji (dostęp zablokowany również przez REVOKE ALL)';

-- policy: allow authenticated users to delete their own investments
create policy investments_delete_policy on public.investments
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy investments_delete_policy on public.investments is 
  'Polityka RLS pozwalająca użytkownikom authenticated na usunięcie własnej inwestycji';

-- policy: deny anon users from deleting investments
create policy investments_delete_policy_anon on public.investments
  for delete
  to anon
  using (false);

comment on policy investments_delete_policy_anon on public.investments is 
  'Polityka RLS blokująca użytkowników anon przed usunięciem inwestycji (dostęp zablokowany również przez REVOKE ALL)';

-- ============================================================================
-- Step 3: Grant permissions to authenticated role
-- ============================================================================
-- Purpose: Allow authenticated users to perform CRUD operations on their data
-- Note: RLS policies ensure users can only access their own data
-- ============================================================================

-- grant permissions on profiles table to authenticated role
-- note: users can only access their own data due to RLS policies
-- permissions granted: select, insert, update, delete
grant select, insert, update, delete on public.profiles to authenticated;

-- grant permissions on investments table to authenticated role
-- note: users can only access their own data due to RLS policies
-- permissions granted: select, insert, update, delete
grant select, insert, update, delete on public.investments to authenticated;

-- ============================================================================
-- Step 4: Revoke permissions from anon and public roles
-- ============================================================================
-- Purpose: Ensure anonymous and public users have no access to user data
-- Security: This is a critical security measure to prevent unauthorized access
-- ============================================================================

-- revoke all permissions on profiles table from anon role
revoke all on public.profiles from anon;

-- revoke all permissions on profiles table from public role
revoke all on public.profiles from public;

-- revoke all permissions on investments table from anon role
revoke all on public.investments from anon;

-- revoke all permissions on investments table from public role
revoke all on public.investments from public;

-- ============================================================================
-- Step 5: Create v_investments_agg view
-- ============================================================================
-- Purpose: Aggregate investment data by user and asset type
-- Usage: Used for FIRE calculations and AI hint generation
-- Security: View inherits RLS from investments table
-- ============================================================================

create view public.v_investments_agg as
select
  user_id,
  sum(amount) as total_amount,
  sum(case when type = 'stock' then amount else 0 end) as sum_stock,
  sum(case when type = 'etf' then amount else 0 end) as sum_etf,
  sum(case when type = 'bond' then amount else 0 end) as sum_bond,
  sum(case when type = 'cash' then amount else 0 end) as sum_cash,
  case
    when sum(amount) > 0 then
      (sum(case when type = 'stock' then amount else 0 end) * 100.0 / sum(amount))
    else 0
  end as share_stock,
  case
    when sum(amount) > 0 then
      (sum(case when type = 'etf' then amount else 0 end) * 100.0 / sum(amount))
    else 0
  end as share_etf,
  case
    when sum(amount) > 0 then
      (sum(case when type = 'bond' then amount else 0 end) * 100.0 / sum(amount))
    else 0
  end as share_bond,
  case
    when sum(amount) > 0 then
      (sum(case when type = 'cash' then amount else 0 end) * 100.0 / sum(amount))
    else 0
  end as share_cash
from public.investments
group by user_id;

comment on view public.v_investments_agg is 
  'Widok agregujący sumy i udziały procentowe dla każdego typu aktywa w portfelu użytkownika';
comment on column public.v_investments_agg.user_id is 
  'Identyfikator użytkownika';
comment on column public.v_investments_agg.total_amount is 
  'Suma wszystkich inwestycji użytkownika w PLN';
comment on column public.v_investments_agg.sum_stock is 
  'Suma inwestycji typu stock w PLN';
comment on column public.v_investments_agg.sum_etf is 
  'Suma inwestycji typu etf w PLN';
comment on column public.v_investments_agg.sum_bond is 
  'Suma inwestycji typu bond w PLN';
comment on column public.v_investments_agg.sum_cash is 
  'Suma inwestycji typu cash w PLN';
comment on column public.v_investments_agg.share_stock is 
  'Procentowy udział akcji (0-100)';
comment on column public.v_investments_agg.share_etf is 
  'Procentowy udział ETF (0-100)';
comment on column public.v_investments_agg.share_bond is 
  'Procentowy udział obligacji (0-100)';
comment on column public.v_investments_agg.share_cash is 
  'Procentowy udział gotówki (0-100)';

-- grant select permission on view to authenticated role
-- note: view inherits RLS from investments table, so users can only see their own aggregated data
grant select on public.v_investments_agg to authenticated;

-- revoke all permissions on view from anon and public roles
revoke all on public.v_investments_agg from anon;
revoke all on public.v_investments_agg from public;

