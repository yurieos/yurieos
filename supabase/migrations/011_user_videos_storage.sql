-- Migration: Create storage bucket and policies for user videos
-- Run this in Supabase Dashboard > SQL Editor
-- Note: Bucket creation may need to be done via Dashboard UI

-- ============================================
-- Storage Bucket: user-videos
-- Create via Dashboard > Storage > New Bucket:
--   - Name: user-videos
--   - Public: No (private)
--   - Allowed MIME types: video/mp4, video/webm
--   - Max file size: 50MB (52428800 bytes)
-- ============================================

-- ============================================
-- Storage Policies
-- Apply via Dashboard > Storage > user-videos > Policies
-- ============================================

-- Users can upload to their own folder (userId/filename)
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
CREATE POLICY "Users can upload own videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-videos' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can view their own videos
CREATE POLICY "Users can view own videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-videos' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-videos' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );
