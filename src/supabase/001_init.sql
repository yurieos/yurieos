-- ============================================
-- Yurie Database Schema
-- Master Migration File
-- ============================================
-- 
-- Run this in Supabase Dashboard > SQL Editor
-- This creates all tables, storage buckets, and security policies
--
-- Prerequisites:
--   1. Supabase project with authentication enabled
--   2. Storage buckets created via Dashboard (see bucket creation section below)
--
-- ============================================


-- ############################################
-- SECTION 1: TABLES
-- ############################################

-- ============================================
-- Table: user_images
-- Stores metadata for AI-generated images
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

ALTER TABLE public.user_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Table: user_videos
-- Stores metadata for AI-generated videos
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

ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Table: user_attachments
-- Stores metadata for chat attachments (images, videos, documents, audio)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('image', 'video', 'document', 'audio')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_attachments ENABLE ROW LEVEL SECURITY;


-- ############################################
-- SECTION 2: TABLE RLS POLICIES
-- ############################################
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- user_images policies
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

-- user_videos policies
CREATE POLICY "Users can view own videos"
  ON public.user_videos FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own videos"
  ON public.user_videos FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own videos"
  ON public.user_videos FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- user_attachments policies
CREATE POLICY "Users can view own attachments"
  ON public.user_attachments FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own attachments"
  ON public.user_attachments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own attachments"
  ON public.user_attachments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);


-- ############################################
-- SECTION 3: INDEXES
-- ############################################

-- user_images indexes
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON public.user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_created_at ON public.user_images(created_at DESC);

-- user_videos indexes
CREATE INDEX IF NOT EXISTS idx_user_videos_user_id ON public.user_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_videos_created_at ON public.user_videos(created_at DESC);

-- user_attachments indexes
CREATE INDEX IF NOT EXISTS idx_user_attachments_user_id ON public.user_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attachments_chat_id ON public.user_attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_attachments_user_chat ON public.user_attachments(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_user_attachments_message_id ON public.user_attachments(message_id);


-- ############################################
-- SECTION 4: STORAGE BUCKET POLICIES
-- ############################################
-- 
-- IMPORTANT: Create buckets first via Supabase Dashboard > Storage > New Bucket
--
-- Bucket: user-images
--   - Public: No (private)
--   - Allowed MIME types: image/png, image/jpeg, image/webp
--   - Max file size: 5MB
--
-- Bucket: user-videos  
--   - Public: No (private)
--   - Allowed MIME types: video/mp4, video/webm
--   - Max file size: 50MB
--
-- Bucket: user-attachments
--   - Public: No (private)
--   - Allowed MIME types: image/*, video/*, audio/*, application/pdf
--   - Max file size: 100MB
--
-- Then run the policies below:

-- user-images bucket policies
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-images' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own images storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- user-videos bucket policies
CREATE POLICY "Users can upload own videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-videos' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own videos storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-videos' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own videos storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-videos' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- user-attachments bucket policies
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-attachments' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own attachments storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-attachments' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own attachments storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-attachments' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );
