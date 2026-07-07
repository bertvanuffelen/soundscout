-- ============================================
-- MIGRATIE 024: Afgeleide opdrachtkaarten verbergen uit de bibliotheek
-- Voer uit in Supabase SQL Editor (NA migratie 023)
-- ============================================
-- Context: een docent kan in de leskaart-editor nu zelf een opdrachtkaart (titel +
-- bullets) typen. Een checkbox "Opslaan in mijn opdrachtkaarten-database" bepaalt of
-- die herbruikbaar wordt:
--   * aangevinkt → de client maakt vooraf een gewone assignment_cards-rij (zichtbaar,
--     oproepbaar in andere leskaarten) en koppelt via lesson_cards.card_id;
--   * uitgevinkt → de tekst leeft als lesson_cards.card_inline; bij activeren doet
--     activate_lesson_card een find-or-create in assignment_cards zodat de leerling de
--     kaart via class_assignments.card_id ziet.
--
-- Zonder deze migratie verschijnt die find-or-create-rij daarna alsnog in de
-- bibliotheek + keuzelijst — dat schendt "uitgevinkt = niet oproepbaar". Oplossing:
-- markeer bij-activatie afgeleide kaarten met is_derived = TRUE en filter ze
-- client-side uit de docent-facing lijsten. De leerling-flow (get_active_assignment,
-- JOIN op card_id) blijft ongewijzigd werken.
--
-- Idempotent + additief. Bestaande rijen behouden is_derived = FALSE (blijven
-- zichtbaar) — geen risicovolle backfill.
--
-- BELANGRIJK (deploy-volgorde): draai deze migratie VÓÓR je de bijbehorende
-- frontend-build uploadt. De client filtert op assignment_cards.is_derived; bestaat
-- die kolom nog niet, dan faalt het ophalen van de opdrachtkaarten.

-- ============================================
-- 1. KOLOM: is_derived
-- ============================================

ALTER TABLE public.assignment_cards
  ADD COLUMN IF NOT EXISTS is_derived BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================
-- 2. RPC: activate_lesson_card — inline find-or-create markeert is_derived = TRUE
-- ============================================
-- Ongewijzigd t.o.v. migratie 019, behalve de INSERT in het card_inline-pad (nu met
-- is_derived = TRUE). Houd deze functie consistent met 019 bij toekomstige wijzigingen.

CREATE OR REPLACE FUNCTION activate_lesson_card(
  p_lesson_card_id UUID,
  p_class_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher UUID := auth.uid();
  v_lc public.lesson_cards%ROWTYPE;
  v_card_id UUID;
  v_card_title TEXT;
BEGIN
  IF v_teacher IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  PERFORM check_rate_limit('activate_lesson_card', v_teacher::text, 60, 60);

  -- Klas-ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = v_teacher
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Leskaart: eigen of ingebouwd
  SELECT * INTO v_lc
  FROM public.lesson_cards
  WHERE id = p_lesson_card_id
    AND (teacher_id = v_teacher OR teacher_id IS NULL)
  LIMIT 1;

  IF v_lc.id IS NULL THEN
    RAISE EXCEPTION 'Leskaart niet gevonden of geen toegang';
  END IF;

  -- Opdrachtkaart oplossen
  IF v_lc.card_id IS NOT NULL THEN
    -- Directe verwijzing (moet een docent-eigen kaart zijn)
    IF EXISTS (
      SELECT 1 FROM public.assignment_cards WHERE id = v_lc.card_id AND teacher_id = v_teacher
    ) THEN
      v_card_id := v_lc.card_id;
    ELSE
      v_card_id := NULL;
    END IF;
  ELSIF v_lc.card_inline IS NOT NULL THEN
    -- Inline kaart → find-or-create een docent-eigen assignment_cards-rij.
    -- Nieuwe rijen zijn AFGELEID (is_derived) → verborgen uit de bibliotheek/keuzelijst.
    v_card_title := left(COALESCE(v_lc.card_inline->>'title', v_lc.title), 120);
    SELECT id INTO v_card_id
    FROM public.assignment_cards
    WHERE teacher_id = v_teacher AND title = v_card_title
    LIMIT 1;

    IF v_card_id IS NULL THEN
      INSERT INTO public.assignment_cards (teacher_id, title, bullets, is_derived)
      VALUES (
        v_teacher,
        v_card_title,
        COALESCE(v_lc.card_inline->'bullets', '[]'::jsonb),
        TRUE
      )
      RETURNING id INTO v_card_id;
    END IF;
  ELSE
    v_card_id := NULL;
  END IF;

  -- Type-geleide delegatie naar bestaande activatie-RPC's
  IF v_lc.assignment_type = 'template' THEN
    RETURN activate_assignment(p_class_id, v_lc.template_id, NULL, NULL, v_card_id, NULL);
  ELSIF v_lc.assignment_type = 'praatplaat' THEN
    RETURN activate_praatplaat_from_catalog(
      p_class_id, v_lc.title, v_lc.pp_theme_id, v_lc.pp_location_id, v_lc.pp_image_url, v_card_id
    );
  ELSIF v_lc.assignment_type = 'storyboard' THEN
    RETURN activate_assignment(p_class_id, NULL, NULL, v_lc.storyboard_ref, v_card_id, NULL);
  ELSE
    RETURN activate_assignment(p_class_id, NULL, NULL, NULL, v_card_id, v_lc.free_theme_id);
  END IF;
END;
$$;

-- ============================================
-- 3. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION activate_lesson_card(UUID, UUID) TO authenticated;
