-- Migration: Create user_images table for Your Stuff feature
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Table: user_images
-- Stores metadata for user-generated images
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  prompt TEXT,
  aspect_ratio TEXT,
  image_size TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Policy: Users can only see their own images
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
CREATE POLICY "Users can view own images"
  ON public.user_images FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Policy: Users can insert their own images
CREATE POLICY "Users can insert own images"
  ON public.user_images FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON public.user_images FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON public.user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_created_at ON public.user_images(created_at DESC);
