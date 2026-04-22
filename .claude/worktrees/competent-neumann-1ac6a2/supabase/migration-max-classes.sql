-- ============================================
-- MIGRATION: MAX CLASSES ENFORCEMENT (TP0-4)
-- Voeg max_classes kolom toe + database trigger
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. KOLOM TOEVOEGEN (als deze nog niet bestaat)
-- ============================================
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS max_classes INT DEFAULT 8;

-- ============================================
-- 2. TRIGGER FUNCTIE
-- Controleert bij INSERT of de docent het maximum
-- aantal klassen niet heeft overschreden
-- ============================================
CREATE OR REPLACE FUNCTION check_max_classes()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  -- Tel bestaande klassen van deze docent
  SELECT COUNT(*) INTO current_count
  FROM public.classes
  WHERE teacher_id = NEW.teacher_id;

  -- Haal limiet op (default: 8)
  SELECT COALESCE(max_classes, 8) INTO max_allowed
  FROM public.teachers
  WHERE id = NEW.teacher_id;

  -- Blokkeer als limiet bereikt
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Maximum number of classes (%) reached', max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. TRIGGER OP CLASSES TABEL
-- ============================================
DROP TRIGGER IF EXISTS enforce_max_classes ON public.classes;

CREATE TRIGGER enforce_max_classes
  BEFORE INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION check_max_classes();

-- ============================================
-- KLAAR!
-- ============================================
-- Test: probeer meer dan 8 klassen aan te maken
-- voor dezelfde docent — dit zou moeten falen.
