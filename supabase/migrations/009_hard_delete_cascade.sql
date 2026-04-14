-- ============================================
-- MIGRATIE 009: Hard delete met CASCADE
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Wijzig foreign keys zodat bij het verwijderen van een klas of
-- praatplaat alle bijbehorende submissions automatisch worden
-- verwijderd (was ON DELETE SET NULL, wordt ON DELETE CASCADE).
-- Dit houdt de database schoon en voorkomt wees-records.

-- ============================================
-- 1. submissions.praatplaat_id: SET NULL → CASCADE
-- ============================================
-- Praatplaat verwijderd → alle submissions van die praatplaat weg

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_praatplaat_id_fkey;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_praatplaat_id_fkey
  FOREIGN KEY (praatplaat_id) REFERENCES public.praatplaten(id)
  ON DELETE CASCADE;

-- ============================================
-- 2. submissions.class_id: SET NULL → CASCADE
-- ============================================
-- Klas verwijderd → alle submissions van die klas weg

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_class_id_fkey;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.classes(id)
  ON DELETE CASCADE;
