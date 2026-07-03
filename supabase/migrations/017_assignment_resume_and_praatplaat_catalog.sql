-- ============================================
-- MIGRATIE 017: Hervatten-model + praatplaat-catalogus (Feature E)
-- Voer uit in Supabase SQL Editor (NA migratie 016)
-- ============================================
-- Twee samenhangende wijzigingen:
--
-- 1. HERVATTEN: activeren maakt niet langer bij elke keer een nieuwe
--    class_assignments-rij. Er is voortaan max één rij per (klas + bron);
--    opnieuw activeren/heractiveren hervat diezelfde rij (werkt activated_at +
--    card_id bij). Bestaande dubbele rijen worden eenmalig opgeschoond.
--
-- 2. PRAATPLAAT-CATALOGUS: praatplaten worden gekozen uit een vaste catalogus
--    i.p.v. per activering aangemaakt. Een nieuwe RPC find-or-create't één
--    praatplaten-instance per (klas + afbeelding) en activeert die. Zo blijven
--    submissions (praatplaat_id + posities) en delen (#73) exact werken.
--    create_praatplaat blijft bestaan voor de dashboard-bibliotheek.

-- ============================================
-- 1. DEDUPE bestaande dubbele class_assignments-rijen
-- ============================================
-- Hou per (klas + bron) precies één rij: bij voorkeur de actieve, anders de
-- nieuwste. Verwijder de rest. Veilig: submissions.assignment_id is GEEN FK
-- (migratie 010), dus dit cascadet geen inzendingen.

DELETE FROM public.class_assignments ca
WHERE ca.id NOT IN (
  SELECT DISTINCT ON (
    class_id,
    COALESCE(template_id::text, ''),
    COALESCE(praatplaat_id::text, ''),
    COALESCE(storyboard_ref, '')
  ) id
  FROM public.class_assignments
  ORDER BY
    class_id,
    COALESCE(template_id::text, ''),
    COALESCE(praatplaat_id::text, ''),
    COALESCE(storyboard_ref, ''),
    is_active DESC,       -- actieve rij wint
    activated_at DESC     -- anders de nieuwste
);

-- ============================================
-- 2. PARTIËLE UNIEKE INDEXEN — max één opdracht per (klas + bron)
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_assignments_uniq_template
  ON public.class_assignments (class_id, template_id) WHERE template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_assignments_uniq_praatplaat
  ON public.class_assignments (class_id, praatplaat_id) WHERE praatplaat_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_assignments_uniq_storyboard
  ON public.class_assignments (class_id, storyboard_ref) WHERE storyboard_ref IS NOT NULL;

-- ============================================
-- 3. RPC: activate_assignment — idempotent (hervatten)
-- ============================================
-- Zelfde signatuur als migratie 016; alleen de body wordt idempotent: vind een
-- bestaande rij voor (klas + bron) → UPDATE (hervat); anders INSERT.

CREATE OR REPLACE FUNCTION activate_assignment(
  p_class_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_praatplaat_id UUID DEFAULT NULL,
  p_storyboard_ref TEXT DEFAULT NULL,
  p_card_id UUID DEFAULT NULL
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
           + (CASE WHEN p_storyboard_ref IS NOT NULL THEN 1 ELSE 0 END);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Precies één opdracht-type vereist';
  END IF;

  -- Bepaal type + valideer ownership van DB-resources
  IF p_template_id IS NOT NULL THEN
    v_type := 'template';
    IF NOT EXISTS (
      SELECT 1 FROM public.templates WHERE id = p_template_id AND teacher_id = auth.uid()
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
  ELSE
    v_type := 'storyboard';
    IF length(trim(p_storyboard_ref)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige storyboard-referentie';
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
      (v_type = 'template'   AND template_id  = p_template_id) OR
      (v_type = 'praatplaat' AND praatplaat_id = p_praatplaat_id) OR
      (v_type = 'storyboard' AND storyboard_ref = p_storyboard_ref)
    )
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    -- Hervat bestaande opdracht (trigger deactiveert de rest)
    UPDATE public.class_assignments
    SET is_active = TRUE, activated_at = NOW(), card_id = p_card_id
    WHERE id = v_assignment_id;
  ELSE
    -- Nieuwe opdracht
    INSERT INTO public.class_assignments (
      class_id, teacher_id, assignment_type, template_id, praatplaat_id, storyboard_ref, card_id, is_active
    )
    VALUES (
      p_class_id, auth.uid(), v_type, p_template_id, p_praatplaat_id, p_storyboard_ref, p_card_id, TRUE
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  RETURN v_assignment_id;
END;
$$;

-- ============================================
-- 4. RPC: activate_praatplaat_from_catalog — find-or-create + activeren
-- ============================================
-- Docent kiest een afbeelding uit de catalogus. Deze RPC vindt-of-maakt één
-- praatplaten-instance per (klas + afbeelding) en activeert die via
-- activate_assignment (hervatten). De naam wordt alleen gebruikt bij het
-- aanmaken van een nieuwe instance.

CREATE OR REPLACE FUNCTION activate_praatplaat_from_catalog(
  p_class_id UUID,
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT,
  p_card_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher UUID := auth.uid();
  v_pp_id UUID;
BEGIN
  PERFORM check_rate_limit('activate_pp_catalog', v_teacher::text, 30, 60);

  -- Valideer ownership van klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = v_teacher
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Find-or-create: één praatplaat-instance per (klas + afbeelding)
  SELECT id INTO v_pp_id
  FROM public.praatplaten
  WHERE class_id = p_class_id AND teacher_id = v_teacher AND image_url = p_image_url
  LIMIT 1;

  IF v_pp_id IS NULL THEN
    INSERT INTO public.praatplaten (class_id, teacher_id, name, theme_id, location_id, image_url, is_active)
    VALUES (p_class_id, v_teacher, p_name, p_theme_id, p_location_id, p_image_url, TRUE)
    RETURNING id INTO v_pp_id;
  END IF;

  -- Activeer via de idempotente assignment-upsert
  RETURN activate_assignment(p_class_id, NULL, v_pp_id, NULL, p_card_id);
END;
$$;

-- ============================================
-- 5. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_praatplaat_from_catalog(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
