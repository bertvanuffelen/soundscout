-- ============================================
-- MIGRATIE 008: Praatplaten class_id nullable
-- Voer uit in Supabase SQL Editor
-- ============================================
-- Praatplaten worden nu op docent-niveau aangemaakt (zonder klas)
-- en later gekoppeld aan een klas via class_assignments.
-- class_id moet daarom nullable worden.

-- ============================================
-- 1. MAAK class_id NULLABLE
-- ============================================

ALTER TABLE public.praatplaten
  ALTER COLUMN class_id DROP NOT NULL;

-- ============================================
-- 2. DROP + RECREATE create_praatplaat RPC
-- ============================================
-- Oude signature had p_class_id als eerste verplichte parameter.
-- Nieuwe signature: p_class_id staat achteraan met DEFAULT NULL.
-- DROP is nodig om PostgREST PGRST203 ambiguity te voorkomen.

DROP FUNCTION IF EXISTS create_praatplaat(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_praatplaat(
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT,
  p_class_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_praatplaat_id UUID;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('create_praatplaat', auth.uid()::text, 10, 60);

  -- Als class_id opgegeven: valideer dat klas bij docent hoort
  IF p_class_id IS NOT NULL THEN
    SELECT teacher_id INTO v_teacher_id
    FROM public.classes
    WHERE id = p_class_id;

    IF v_teacher_id IS NULL OR v_teacher_id != auth.uid() THEN
      RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Maak praatplaat aan
  INSERT INTO public.praatplaten (class_id, teacher_id, name, theme_id, location_id, image_url)
  VALUES (p_class_id, auth.uid(), p_name, p_theme_id, p_location_id, p_image_url)
  RETURNING id INTO v_praatplaat_id;

  RETURN v_praatplaat_id;
END;
$$;

-- ============================================
-- 3. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION create_praatplaat(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
