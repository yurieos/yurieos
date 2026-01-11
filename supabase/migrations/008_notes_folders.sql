-- Migration: Add is_folder column to notes table
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Add is_folder column to notes
-- ============================================

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE;

-- ============================================
-- Index for folder queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_is_folder ON public.notes(user_id, is_folder);
