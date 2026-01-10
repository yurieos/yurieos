-- Migration: Create storage bucket and policies for user images
-- Run this in Supabase Dashboard > SQL Editor
-- Note: Bucket creation may need to be done via Dashboard UI

-- ============================================
-- Storage Bucket: user-images
-- Create via Dashboard > Storage > New Bucket:
--   - Name: user-images
--   - Public: No (private)
--   - Allowed MIME types: image/png, image/jpeg, image/webp
--   - Max file size: 5MB (5242880 bytes)
-- ============================================

-- ============================================
-- Storage Policies
-- Apply via Dashboard > Storage > user-images > Policies
-- ============================================

-- Users can upload to their own folder (userId/filename)
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-images' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can view their own images
CREATE POLICY "Users can view own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );
