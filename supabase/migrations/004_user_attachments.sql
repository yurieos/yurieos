-- Migration: Create user_attachments table for chat attachment storage
-- Run this in Supabase Dashboard > SQL Editor
-- 
-- This table stores metadata for user-uploaded attachments in chat messages.
-- The actual files are stored in Supabase Storage (user-attachments bucket).

-- ============================================
-- Table: user_attachments
-- Stores metadata for all user-uploaded chat attachments
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

-- Enable Row Level Security
ALTER TABLE public.user_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Policy: Users can only see their own attachments
-- Using (select auth.uid()) for performance - caches result per-statement
-- @see https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
CREATE POLICY "Users can view own attachments"
  ON public.user_attachments FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Policy: Users can insert their own attachments
CREATE POLICY "Users can insert own attachments"
  ON public.user_attachments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON public.user_attachments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- Indexes for performance
-- ============================================

-- Index for querying attachments by user
CREATE INDEX IF NOT EXISTS idx_user_attachments_user_id 
  ON public.user_attachments(user_id);

-- Index for querying attachments by chat (for deletion when chat is deleted)
CREATE INDEX IF NOT EXISTS idx_user_attachments_chat_id 
  ON public.user_attachments(chat_id);

-- Composite index for querying attachments by user and chat
CREATE INDEX IF NOT EXISTS idx_user_attachments_user_chat 
  ON public.user_attachments(user_id, chat_id);

-- Index for querying attachments by message (for display)
CREATE INDEX IF NOT EXISTS idx_user_attachments_message_id 
  ON public.user_attachments(message_id);
