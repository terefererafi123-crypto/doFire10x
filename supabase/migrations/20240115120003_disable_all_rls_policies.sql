-- ============================================================================
-- Migration: Disable All RLS Policies
-- ============================================================================
-- Purpose: Remove all Row Level Security policies from profiles and investments tables
-- 
-- This migration drops:
-- - All RLS policies for profiles table (8 policies)
-- - All RLS policies for investments table (8 policies)
--
-- Tables affected: profiles, investments
-- Dependencies: Must run after enable_rls_and_grants.sql
--
-- Note: This migration uses DROP POLICY IF EXISTS to safely remove policies
-- even if they don't exist. After this migration, tables will have RLS enabled
-- but no policies, effectively blocking all access until new policies are created.
-- ============================================================================

-- ============================================================================
-- Step 1: Drop RLS policies for profiles table
-- ============================================================================
-- Purpose: Remove all RLS policies from profiles table
-- ============================================================================

-- drop policy: profiles_select_policy (authenticated)
drop policy if exists profiles_select_policy on public.profiles;

-- drop policy: profiles_select_policy_anon (anon)
drop policy if exists profiles_select_policy_anon on public.profiles;

-- drop policy: profiles_insert_policy (authenticated)
drop policy if exists profiles_insert_policy on public.profiles;

-- drop policy: profiles_insert_policy_anon (anon)
drop policy if exists profiles_insert_policy_anon on public.profiles;

-- drop policy: profiles_update_policy (authenticated)
drop policy if exists profiles_update_policy on public.profiles;

-- drop policy: profiles_update_policy_anon (anon)
drop policy if exists profiles_update_policy_anon on public.profiles;

-- drop policy: profiles_delete_policy (authenticated)
drop policy if exists profiles_delete_policy on public.profiles;

-- drop policy: profiles_delete_policy_anon (anon)
drop policy if exists profiles_delete_policy_anon on public.profiles;

-- ============================================================================
-- Step 2: Drop RLS policies for investments table
-- ============================================================================
-- Purpose: Remove all RLS policies from investments table
-- ============================================================================

-- drop policy: investments_select_policy (authenticated)
drop policy if exists investments_select_policy on public.investments;

-- drop policy: investments_select_policy_anon (anon)
drop policy if exists investments_select_policy_anon on public.investments;

-- drop policy: investments_insert_policy (authenticated)
drop policy if exists investments_insert_policy on public.investments;

-- drop policy: investments_insert_policy_anon (anon)
drop policy if exists investments_insert_policy_anon on public.investments;

-- drop policy: investments_update_policy (authenticated)
drop policy if exists investments_update_policy on public.investments;

-- drop policy: investments_update_policy_anon (anon)
drop policy if exists investments_update_policy_anon on public.investments;

-- drop policy: investments_delete_policy (authenticated)
drop policy if exists investments_delete_policy on public.investments;

-- drop policy: investments_delete_policy_anon (anon)
drop policy if exists investments_delete_policy_anon on public.investments;

-- ============================================================================
-- Note: RLS is still enabled on both tables
-- ============================================================================
-- After dropping all policies, RLS remains enabled on profiles and investments tables.
-- Without any policies, all access to these tables will be blocked for all roles,
-- including authenticated users. This is a security measure - tables are effectively
-- inaccessible until new RLS policies are created.
--
-- To re-enable access, create new RLS policies or disable RLS entirely using:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.investments DISABLE ROW LEVEL SECURITY;
-- ============================================================================



