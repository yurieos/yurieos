-- Migration: Optimize RLS policies for better performance
-- Run this if you already have the old policies from 001_user_images.sql
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- Drop existing user_images policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own images" ON public.user_images;
DROP POLICY IF EXISTS "Users can insert own images" ON public.user_images;
DROP POLICY IF EXISTS "Users can delete own images" ON public.user_images;

-- ============================================
-- Re-create with optimized versions
-- Using (select auth.uid()) caches result per-statement
-- TO authenticated skips evaluation for anonymous users
-- ============================================

CREATE POLICY "Users can view own images"
  ON public.user_images FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own images"
  ON public.user_images FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own images"
  ON public.user_images FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
