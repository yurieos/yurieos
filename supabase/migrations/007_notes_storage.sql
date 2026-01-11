-- Migration: Create storage bucket for note files
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Storage bucket for note images and files
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-files',
  'note-files',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json'
  ]
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage policies for note-files bucket
-- Files are stored as: {user_id}/{note_id}/{filename}
-- ============================================

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload note files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'note-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own note files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'note-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own note files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'note-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'note-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own note files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'note-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
