-- Migration: Create storage bucket and policies for user chat attachments
-- Run this in Supabase Dashboard > SQL Editor
-- Note: Bucket creation may need to be done via Dashboard UI
--
-- This bucket stores all user-uploaded chat attachments:
-- - Images (PNG, JPEG, WebP, HEIC, HEIF)
-- - Videos (MP4, MPEG, MOV, AVI, WebM, etc.)
-- - Documents (PDF)
-- - Audio (WAV, MP3, AAC, OGG, FLAC)

-- ============================================
-- Storage Bucket: user-attachments
-- Create via Dashboard > Storage > New Bucket:
--   - Name: user-attachments
--   - Public: No (private)
--   - Allowed MIME types: See list below
--   - Max file size: 100MB (104857600 bytes) for videos
-- 
-- Allowed MIME types:
--   Images: image/png, image/jpeg, image/webp, image/heic, image/heif
--   Videos: video/mp4, video/mpeg, video/mov, video/avi, video/x-flv, 
--           video/mpg, video/webm, video/wmv, video/3gpp
--   Documents: application/pdf
--   Audio: audio/wav, audio/wave, audio/x-wav, audio/mp3, audio/mpeg,
--          audio/aiff, audio/x-aiff, audio/aac, audio/x-aac, audio/ogg,
--          audio/flac, audio/x-flac
-- ============================================

-- ============================================
-- Storage Policies
-- Apply via Dashboard > Storage > user-attachments > Policies
-- 
-- Folder structure: {user_id}/{chat_id}/{attachment_id}.{ext}
-- ============================================

-- Users can upload to their own folder (userId/chatId/filename)
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-attachments' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can view their own attachments
CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-attachments' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-attachments' 
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );
