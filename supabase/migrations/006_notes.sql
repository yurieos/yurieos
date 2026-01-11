-- Migration: Create notes tables for Notion-like note-taking feature
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Table: notes
-- Stores note/page metadata with hierarchical structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT, -- emoji or icon identifier
  cover_image TEXT, -- storage path for cover
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0, -- for ordering siblings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: note_blocks
-- Stores block content with JSONB for flexibility
-- ============================================

CREATE TABLE IF NOT EXISTS public.note_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- paragraph, heading, list, table, database, etc.
  content JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: note_databases
-- Stores inline database definitions (for table/kanban/gallery views)
-- ============================================

CREATE TABLE IF NOT EXISTS public.note_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Database',
  schema JSONB NOT NULL DEFAULT '[]', -- property definitions
  default_view TEXT DEFAULT 'table', -- table, kanban, gallery, calendar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: note_database_entries
-- Stores rows/entries in inline databases
-- ============================================

CREATE TABLE IF NOT EXISTS public.note_database_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.note_databases(id) ON DELETE CASCADE,
  properties JSONB NOT NULL DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_database_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for notes
-- Using (select auth.uid()) for performance - caches result per-statement
-- ============================================

-- Policy: Users can view their own notes
CREATE POLICY "Users can view own notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- RLS Policies for note_blocks (via note ownership)
-- ============================================

-- Policy: Users can view blocks in their own notes
CREATE POLICY "Users can view blocks in own notes"
  ON public.note_blocks FOR SELECT
  TO authenticated
  USING (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- Policy: Users can insert blocks in their own notes
CREATE POLICY "Users can insert blocks in own notes"
  ON public.note_blocks FOR INSERT
  TO authenticated
  WITH CHECK (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- Policy: Users can update blocks in their own notes
CREATE POLICY "Users can update blocks in own notes"
  ON public.note_blocks FOR UPDATE
  TO authenticated
  USING (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- Policy: Users can delete blocks in their own notes
CREATE POLICY "Users can delete blocks in own notes"
  ON public.note_blocks FOR DELETE
  TO authenticated
  USING (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- ============================================
-- RLS Policies for note_databases
-- ============================================

-- Policy: Users can view databases in their own notes
CREATE POLICY "Users can view databases in own notes"
  ON public.note_databases FOR SELECT
  TO authenticated
  USING (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- Policy: Users can insert databases in their own notes
CREATE POLICY "Users can insert databases in own notes"
  ON public.note_databases FOR INSERT
  TO authenticated
  WITH CHECK (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- Policy: Users can update databases in their own notes
CREATE POLICY "Users can update databases in own notes"
  ON public.note_databases FOR UPDATE
  TO authenticated
  USING (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- Policy: Users can delete databases in their own notes
CREATE POLICY "Users can delete databases in own notes"
  ON public.note_databases FOR DELETE
  TO authenticated
  USING (note_id IN (SELECT id FROM public.notes WHERE user_id = (SELECT auth.uid())));

-- ============================================
-- RLS Policies for note_database_entries
-- ============================================

-- Policy: Users can view entries in their own databases
CREATE POLICY "Users can view entries in own databases"
  ON public.note_database_entries FOR SELECT
  TO authenticated
  USING (database_id IN (
    SELECT d.id FROM public.note_databases d
    JOIN public.notes n ON d.note_id = n.id
    WHERE n.user_id = (SELECT auth.uid())
  ));

-- Policy: Users can insert entries in their own databases
CREATE POLICY "Users can insert entries in own databases"
  ON public.note_database_entries FOR INSERT
  TO authenticated
  WITH CHECK (database_id IN (
    SELECT d.id FROM public.note_databases d
    JOIN public.notes n ON d.note_id = n.id
    WHERE n.user_id = (SELECT auth.uid())
  ));

-- Policy: Users can update entries in their own databases
CREATE POLICY "Users can update entries in own databases"
  ON public.note_database_entries FOR UPDATE
  TO authenticated
  USING (database_id IN (
    SELECT d.id FROM public.note_databases d
    JOIN public.notes n ON d.note_id = n.id
    WHERE n.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (database_id IN (
    SELECT d.id FROM public.note_databases d
    JOIN public.notes n ON d.note_id = n.id
    WHERE n.user_id = (SELECT auth.uid())
  ));

-- Policy: Users can delete entries in their own databases
CREATE POLICY "Users can delete entries in own databases"
  ON public.note_database_entries FOR DELETE
  TO authenticated
  USING (database_id IN (
    SELECT d.id FROM public.note_databases d
    JOIN public.notes n ON d.note_id = n.id
    WHERE n.user_id = (SELECT auth.uid())
  ));

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON public.notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_archived ON public.notes(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_notes_user_favorite ON public.notes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_notes_position ON public.notes(parent_id, position);
CREATE INDEX IF NOT EXISTS idx_note_blocks_note_id ON public.note_blocks(note_id);
CREATE INDEX IF NOT EXISTS idx_note_blocks_position ON public.note_blocks(note_id, position);
CREATE INDEX IF NOT EXISTS idx_note_databases_note_id ON public.note_databases(note_id);
CREATE INDEX IF NOT EXISTS idx_note_databases_block_id ON public.note_databases(block_id);
CREATE INDEX IF NOT EXISTS idx_note_database_entries_database_id ON public.note_database_entries(database_id);
CREATE INDEX IF NOT EXISTS idx_note_database_entries_position ON public.note_database_entries(database_id, position);

-- ============================================
-- Trigger for updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_blocks_updated_at
  BEFORE UPDATE ON public.note_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_databases_updated_at
  BEFORE UPDATE ON public.note_databases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_database_entries_updated_at
  BEFORE UPDATE ON public.note_database_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
