-- Migration: Create user_videos table for video storage feature
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Table: user_videos
-- Stores metadata for user-generated videos (Veo 3.1)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  prompt TEXT,
  aspect_ratio TEXT,
  resolution TEXT,
  duration_seconds TEXT,
  mime_type TEXT NOT NULL DEFAULT 'video/mp4',
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Policy: Users can only see their own videos
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
CREATE POLICY "Users can view own videos"
  ON public.user_videos FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Policy: Users can insert their own videos
CREATE POLICY "Users can insert own videos"
  ON public.user_videos FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Users can delete their own videos
CREATE POLICY "Users can delete own videos"
  ON public.user_videos FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_videos_user_id ON public.user_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_videos_created_at ON public.user_videos(created_at DESC);
