-- Migration 032: Fix — inline-opdrachtkaart matcht ook op inhoud (QA-7)
--
-- Bug: activate_lesson_card (019, laatst 024) vond de te hergebruiken
-- assignment_cards-rij op (teacher_id, title) alléén. Alle ingebouwde
-- leskaarten delen echter dezelfde titel ("Zo werkt deze opdracht"),
-- waardoor bijv. de Drum beat-template-leskaart de eerder aangemaakte
-- práátplaat-kaart van de Robotfabriek gekoppeld kreeg — de leerling zag
-- dan "Je kiest straks een plek op de afbeelding" bij een template.
--
-- Fix: het find-or-create matcht nu op titel ÉN bullets (exacte JSONB-
-- gelijkheid). Verschillende inhoud → eigen (afgeleide) kaart. Bestaande
-- rijen blijven onaangetast; bij de eerstvolgende activatie wordt de
-- juiste kaart aangemaakt en gekoppeld.
--
-- Idempotent en additief (CREATE OR REPLACE). Uitvoeren in de SQL Editor.

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
  v_card_bullets JSONB;
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
    -- Match op titel ÉN bullets: ingebouwde kaarten delen dezelfde titel,
    -- dus titel alleen koppelt de verkeerde inhoud (QA-7).
    -- Nieuwe rijen zijn AFGELEID (is_derived) → verborgen uit de bibliotheek.
    v_card_title := left(COALESCE(v_lc.card_inline->>'title', v_lc.title), 120);
    v_card_bullets := COALESCE(v_lc.card_inline->'bullets', '[]'::jsonb);

    SELECT id INTO v_card_id
    FROM public.assignment_cards
    WHERE teacher_id = v_teacher
      AND title = v_card_title
      AND bullets = v_card_bullets
    LIMIT 1;

    IF v_card_id IS NULL THEN
      INSERT INTO public.assignment_cards (teacher_id, title, bullets, is_derived)
      VALUES (v_teacher, v_card_title, v_card_bullets, TRUE)
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

GRANT EXECUTE ON FUNCTION activate_lesson_card(UUID, UUID) TO authenticated;
