-- Migration: Fix function search_path security warning
-- Sets immutable search_path to prevent search_path injection attacks

-- ============================================
-- Fix update_updated_at_column function
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
