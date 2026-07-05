-- ============================================
-- MIGRATIE 022: Systeem-templates (eigenaarloze, gedeelde templates)
-- Voer uit in Supabase SQL Editor (NA migratie 021)
-- ============================================
-- Plumbing zodat een template GEEN docent-eigenaar hoeft te hebben
-- (teacher_id NULL) en een `builtin_key` kan dragen. Zo kan een ingebouwde
-- leskaart een kant-en-klare compositie (type template) aan ÁLLE docenten
-- aanbieden — net als de andere ingebouwde leskaarten.
--
-- Deze migratie voegt alleen de mogelijkheid toe; de eigenlijke inhoud
-- (composition_data) komt in migratie 023, als kopie van een door de docent
-- in SoundScout gebouwde template. Zonder 023 heeft 022 geen zichtbaar effect.
--
-- Symmetrisch met `lesson_cards` (migratie 019): builtin_key + builtin-ownership
-- CHECK + RLS-leesrecht voor ingebouwde rijen.

-- ============================================
-- 1. Kolom + nullbaarheid + constraints
-- ============================================

ALTER TABLE public.templates ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS builtin_key TEXT;

-- Ingebouwd XOR docent-eigen (bestaande rijen: teacher_id NOT NULL + builtin_key
-- NULL → voldoen automatisch).
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_builtin_ownership;
ALTER TABLE public.templates ADD CONSTRAINT templates_builtin_ownership CHECK (
  (teacher_id IS NULL AND builtin_key IS NOT NULL) OR
  (teacher_id IS NOT NULL AND builtin_key IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_builtin
  ON public.templates(builtin_key) WHERE builtin_key IS NOT NULL;

-- ============================================
-- 2. RLS: alle docenten mogen systeem-templates lezen (naast hun eigen)
-- ============================================
-- Additieve permissieve policy; wordt ge-OR'd met de bestaande "eigen templates".

DROP POLICY IF EXISTS "Teachers can read system templates" ON public.templates;
CREATE POLICY "Teachers can read system templates"
  ON public.templates FOR SELECT
  TO authenticated
  USING (teacher_id IS NULL);

-- ============================================
-- 3. RPC: activate_assignment — sta systeem-templates toe
-- ============================================
-- Eindversie identiek aan migratie 018, met één wijziging: de template-
-- ownership-check accepteert nu ook systeem-templates (teacher_id IS NULL).
-- Signatuur/return-type ongewijzigd → CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION activate_assignment(
  p_class_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_praatplaat_id UUID DEFAULT NULL,
  p_storyboard_ref TEXT DEFAULT NULL,
  p_card_id UUID DEFAULT NULL,
  p_free_theme_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id UUID;
  v_type TEXT;
  v_count INT;
BEGIN
  -- Valideer ownership van klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Valideer: precies één opdracht-type
  v_count := (CASE WHEN p_template_id IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_praatplaat_id IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_storyboard_ref IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_free_theme_id IS NOT NULL THEN 1 ELSE 0 END);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Precies één opdracht-type vereist';
  END IF;

  -- Bepaal type + valideer ownership van DB-resources
  IF p_template_id IS NOT NULL THEN
    v_type := 'template';
    -- Eigen template OF een systeem-template (teacher_id NULL, gedeeld)
    IF NOT EXISTS (
      SELECT 1 FROM public.templates
      WHERE id = p_template_id AND (teacher_id = auth.uid() OR teacher_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'Template niet gevonden of geen toegang';
    END IF;
  ELSIF p_praatplaat_id IS NOT NULL THEN
    v_type := 'praatplaat';
    IF NOT EXISTS (
      SELECT 1 FROM public.praatplaten WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
    END IF;
  ELSIF p_storyboard_ref IS NOT NULL THEN
    v_type := 'storyboard';
    IF length(trim(p_storyboard_ref)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige storyboard-referentie';
    END IF;
  ELSE
    v_type := 'free';
    IF length(trim(p_free_theme_id)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige thema-referentie';
    END IF;
  END IF;

  -- Valideer ownership van de (optionele) opdrachtkaart
  IF p_card_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.assignment_cards WHERE id = p_card_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Opdrachtkaart niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Hervatten: bestaande rij voor (klas + bron) zoeken
  SELECT id INTO v_assignment_id
  FROM public.class_assignments
  WHERE class_id = p_class_id
    AND (
      (v_type = 'template'   AND template_id   = p_template_id) OR
      (v_type = 'praatplaat' AND praatplaat_id = p_praatplaat_id) OR
      (v_type = 'storyboard' AND storyboard_ref = p_storyboard_ref) OR
      (v_type = 'free'       AND free_theme_id  = p_free_theme_id)
    )
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    UPDATE public.class_assignments
    SET is_active = TRUE, activated_at = NOW(), card_id = p_card_id
    WHERE id = v_assignment_id;
  ELSE
    INSERT INTO public.class_assignments (
      class_id, teacher_id, assignment_type, template_id, praatplaat_id, storyboard_ref, free_theme_id, card_id, is_active
    )
    VALUES (
      p_class_id, auth.uid(), v_type, p_template_id, p_praatplaat_id, p_storyboard_ref, p_free_theme_id, p_card_id, TRUE
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  RETURN v_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
