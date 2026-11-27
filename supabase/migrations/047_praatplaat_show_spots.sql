-- =============================================================================
-- 047 — Docentinstelling "Plekken tonen" bij een praatplaat-opdracht
--       (raad-de-plek, wens Bert 26-11-2026)
-- =============================================================================
--
-- Waarom: in de Sinterklaasles raadt de klas welke plek een leerling koos. Dat
-- kan niet als de marker al op de plaat staat. Staat deze instelling uit, dan
-- toont de presentatie de plaat zonder markers en de soundscapes als lijst
-- ernaast; de docent onthult een plek met één klik.
--
-- Additief en veilig:
-- - class_assignments.show_spots, DEFAULT TRUE: bestaande opdrachten blijven
--   precies zoals ze zijn (markers op de plaat);
-- - de docent zet hem om via de bestaande UPDATE-RLS-policy (006/036), net als
--   duration_label (033) en students_type_title (037);
-- - get_active_assignment geeft de waarde mee in `payload` (JSONB): het
--   teruggegeven type verandert niet, oudere apps negeren het veld. De
--   leerling-app gebruikt het alleen bij "Luister naar klasgenoten";
-- - de publieke deel-RPC's (gedeeld bord, klas-album) geven `show_spots` mee
--   en laten bij "uit" de posities WEG uit het antwoord (server-side, dus ook
--   niet via de netwerk-tab te zien);
-- - lesson_cards krijgt twee optionele preset-velden (show_spots,
--   duration_label) zodat een leskaart een opdracht volledig kan instellen;
--   activate_lesson_card past ze toe op de geactiveerde opdracht.
--
-- Bodies: get_active_assignment = 037 + 'show_spots'; activate_lesson_card =
-- 032 + preset toepassen; get_shared_praatplaat = 012 + show_spots;
-- get_shared_class_album = 031 + show_spots.
--
-- Terugdraaien (alleen als het moet; de app werkt ook zonder deze kolommen):
--   ALTER TABLE public.class_assignments DROP COLUMN IF EXISTS show_spots;
--   ALTER TABLE public.lesson_cards DROP COLUMN IF EXISTS show_spots,
--                                   DROP COLUMN IF EXISTS duration_label;
--   en daarna de vier functies opnieuw aanmaken uit 037 / 032 / 012 / 031.
-- =============================================================================

BEGIN;

-- --- 1. Kolommen -------------------------------------------------------------

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS show_spots BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.class_assignments.show_spots IS
  'Praatplaat: staan de gekozen plekken op de plaat bij presenteren/delen? FALSE = raad-de-plek (lijst naast de plaat, docent onthult).';

ALTER TABLE public.lesson_cards
  ADD COLUMN IF NOT EXISTS show_spots BOOLEAN,
  ADD COLUMN IF NOT EXISTS duration_label TEXT
    CHECK (duration_label IS NULL OR char_length(duration_label) <= 60);

COMMENT ON COLUMN public.lesson_cards.show_spots IS
  'Preset voor class_assignments.show_spots bij activeren (alleen praatplaat). NULL = standaard (tonen).';
COMMENT ON COLUMN public.lesson_cards.duration_label IS
  'Preset voor class_assignments.duration_label bij activeren. NULL = niet aanpassen.';

-- --- 2. get_active_assignment: show_spots in de payload ------------------------

CREATE OR REPLACE FUNCTION public.get_active_assignment(p_class_code text)
 RETURNS TABLE(assignment_type text, payload jsonb, card jsonb, class_id uuid, class_name text, peer_review jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 200, 60);

  RETURN QUERY
  SELECT
    ca.assignment_type,
    (CASE ca.assignment_type
      WHEN 'template' THEN jsonb_build_object(
        'template_id', t.id,
        'name', t.name,
        'description', t.description,
        'teacher_name', te.display_name,
        'composition_data', t.composition_data,
        'instructions', t.instructions,
        'lock_options', t.lock_options
      )
      WHEN 'praatplaat' THEN jsonb_build_object(
        'praatplaat_id', p.id,
        'name', p.name,
        'image_url', p.image_url,
        'theme_id', p.theme_id,
        'location_id', p.location_id
      )
      WHEN 'storyboard' THEN jsonb_build_object(
        'storyboard_ref', ca.storyboard_ref
      )
      WHEN 'free' THEN jsonb_build_object(
        'free_theme_id', ca.free_theme_id
      )
    END
      || jsonb_build_object(
        'duration_label', ca.duration_label,
        'students_type_title', ca.students_type_title,
        'show_spots', ca.show_spots
      )
    ) AS payload,
    CASE
      WHEN ca.card_id IS NOT NULL THEN jsonb_build_object(
        'title', ac.title,
        'bullets', ac.bullets
      )
      ELSE NULL
    END AS card,
    c.id AS class_id,
    c.name AS class_name,
    CASE
      WHEN ca.peer_review_enabled AND fc.id IS NOT NULL THEN jsonb_build_object(
        'enabled', TRUE,
        'card_title', fc.title,
        'chips', to_jsonb(fc.chips),
        'closes_at', ca.peer_review_closes_at
      )
      ELSE NULL
    END AS peer_review
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  LEFT JOIN public.templates t ON t.id = ca.template_id
  LEFT JOIN public.teachers te ON te.id = t.teacher_id
  LEFT JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  LEFT JOIN public.assignment_cards ac ON ac.id = ca.card_id
  LEFT JOIN public.feedback_cards fc ON fc.id = ca.feedback_card_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$function$;

ALTER FUNCTION public.get_active_assignment(text) SET search_path = public;

-- --- 3. activate_lesson_card: preset toepassen op de opdracht ------------------
-- Zelfde body als 032; nieuw is alleen het slot: de geactiveerde opdracht
-- krijgt de instellingen van de leskaart. Een leskaart ZONDER show_spots zet
-- een praatplaat-opdracht terug op "tonen" (een leskaart legt de opdracht
-- volledig vast; een eerder verborgen stand mag niet stil blijven hangen).

CREATE OR REPLACE FUNCTION public.activate_lesson_card(
  p_lesson_card_id UUID,
  p_class_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher UUID := auth.uid();
  v_lc public.lesson_cards%ROWTYPE;
  v_card_id UUID;
  v_card_title TEXT;
  v_card_bullets JSONB;
  v_assignment_id UUID;
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
    -- Match op titel ÉN bullets (QA-7). Nieuwe rijen zijn AFGELEID.
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
    v_assignment_id := activate_assignment(p_class_id, v_lc.template_id, NULL, NULL, v_card_id, NULL);
  ELSIF v_lc.assignment_type = 'praatplaat' THEN
    v_assignment_id := activate_praatplaat_from_catalog(
      p_class_id, v_lc.title, v_lc.pp_theme_id, v_lc.pp_location_id, v_lc.pp_image_url, v_card_id
    );
  ELSIF v_lc.assignment_type = 'storyboard' THEN
    v_assignment_id := activate_assignment(p_class_id, NULL, NULL, v_lc.storyboard_ref, v_card_id, NULL);
  ELSE
    v_assignment_id := activate_assignment(p_class_id, NULL, NULL, NULL, v_card_id, v_lc.free_theme_id);
  END IF;

  -- Preset toepassen (047): tijdsduur + plekken tonen. De teacher_id-klem is
  -- dubbel slot naast de ownership-checks hierboven.
  UPDATE public.class_assignments
  SET duration_label = COALESCE(v_lc.duration_label, duration_label),
      show_spots = CASE
        WHEN v_lc.assignment_type = 'praatplaat' THEN COALESCE(v_lc.show_spots, TRUE)
        ELSE show_spots
      END
  WHERE id = v_assignment_id
    AND teacher_id = v_teacher;

  RETURN v_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_lesson_card(UUID, UUID) TO authenticated;

-- --- 4. get_shared_praatplaat: show_spots + posities weg bij "uit" -------------

CREATE OR REPLACE FUNCTION public.get_shared_praatplaat(p_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_praatplaat RECORD;
  v_result JSONB;
  v_submissions JSONB;
  v_show BOOLEAN;
BEGIN
  -- Rate limit: 30 per minuut per code
  PERFORM check_rate_limit('get_shared_praatplaat', 'pp:' || p_code, 30, 60);

  -- Haal praatplaat op
  SELECT id, name, image_url, theme_id, location_id, share_expires_at
  INTO v_praatplaat
  FROM public.praatplaten
  WHERE share_code = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden';
  END IF;

  -- Check verloopdatum
  IF v_praatplaat.share_expires_at IS NOT NULL AND v_praatplaat.share_expires_at < NOW() THEN
    RAISE EXCEPTION 'Link is verlopen';
  END IF;

  -- Verhoog view count
  UPDATE public.praatplaten
  SET share_view_count = share_view_count + 1
  WHERE share_code = p_code;

  -- Plekken tonen? De instelling staat op de opdracht-rij van deze praatplaat
  -- (één rij per klas + praatplaat). Geen rij (oude praatplaat) = tonen.
  SELECT ca.show_spots INTO v_show
  FROM public.class_assignments ca
  WHERE ca.praatplaat_id = v_praatplaat.id
  ORDER BY ca.activated_at DESC
  LIMIT 1;
  v_show := COALESCE(v_show, TRUE);

  -- Haal submissions op (bij "uit": zonder posities)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'student_name', s.student_name,
      'composition_name', s.composition_name,
      'composition_data', CASE WHEN v_show THEN s.composition_data::jsonb
                               ELSE s.composition_data::jsonb - 'praatplaatPosition' END,
      'position_x', CASE WHEN v_show THEN s.position_x ELSE NULL END,
      'position_y', CASE WHEN v_show THEN s.position_y ELSE NULL END,
      'created_at', s.created_at
    ) ORDER BY s.created_at DESC
  ), '[]'::jsonb)
  INTO v_submissions
  FROM public.submissions s
  WHERE s.praatplaat_id = v_praatplaat.id;

  -- Bouw response
  v_result := jsonb_build_object(
    'praatplaat', jsonb_build_object(
      'id', v_praatplaat.id,
      'name', v_praatplaat.name,
      'image_url', v_praatplaat.image_url,
      'theme_id', v_praatplaat.theme_id,
      'location_id', v_praatplaat.location_id
    ),
    'show_spots', v_show,
    'submissions', v_submissions
  );

  RETURN v_result;
END;
$$;

-- --- 5. get_shared_class_album: show_spots + posities weg bij "uit" ------------

CREATE OR REPLACE FUNCTION public.get_shared_class_album(p_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ca RECORD;
  v_class_name TEXT;
  v_assignment_name TEXT;
  v_image_url TEXT;
  v_submissions JSONB;
  v_show BOOLEAN;
BEGIN
  -- Rate limit: 30 per minuut per code
  PERFORM check_rate_limit('get_shared_class_album', 'alb:' || p_code, 30, 60);

  SELECT ca.id, ca.class_id, ca.assignment_type, ca.template_id, ca.praatplaat_id,
         ca.storyboard_ref, ca.free_theme_id, ca.share_expires_at, ca.show_spots
  INTO v_ca
  FROM public.class_assignments ca
  WHERE ca.share_code = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Album niet gevonden';
  END IF;

  IF v_ca.share_expires_at IS NOT NULL AND v_ca.share_expires_at < NOW() THEN
    RAISE EXCEPTION 'Link is verlopen';
  END IF;

  UPDATE public.class_assignments
  SET share_view_count = share_view_count + 1
  WHERE share_code = p_code;

  -- Alleen een praatplaat-opdracht kan plekken verbergen
  v_show := NOT (v_ca.assignment_type = 'praatplaat' AND v_ca.show_spots IS FALSE);

  SELECT c.name INTO v_class_name FROM public.classes c WHERE c.id = v_ca.class_id;

  -- Naam + afbeelding per type (storyboard/free resolvet de client via de ref)
  IF v_ca.assignment_type = 'praatplaat' THEN
    SELECT p.name, p.image_url INTO v_assignment_name, v_image_url
    FROM public.praatplaten p WHERE p.id = v_ca.praatplaat_id;
  ELSIF v_ca.assignment_type = 'template' THEN
    SELECT t.name INTO v_assignment_name FROM public.templates t WHERE t.id = v_ca.template_id;
    v_image_url := NULL;
  ELSE
    v_assignment_name := NULL;
    v_image_url := NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'student_name', s.student_name,
      'composition_name', s.composition_name,
      'composition_data', CASE WHEN v_show THEN s.composition_data::jsonb
                               ELSE s.composition_data::jsonb - 'praatplaatPosition' END,
      'position_x', CASE WHEN v_show THEN s.position_x ELSE NULL END,
      'position_y', CASE WHEN v_show THEN s.position_y ELSE NULL END,
      'created_at', s.created_at
    ) ORDER BY s.created_at ASC
  ), '[]'::jsonb)
  INTO v_submissions
  FROM public.submissions s
  WHERE s.class_id = v_ca.class_id
    AND s.submitted_at IS NOT NULL
    AND (
      (v_ca.assignment_type = 'praatplaat'
        AND (s.praatplaat_id = v_ca.praatplaat_id OR s.assignment_id = v_ca.praatplaat_id))
      OR (v_ca.assignment_type = 'template' AND s.assignment_id = v_ca.template_id)
      OR (v_ca.assignment_type = 'storyboard' AND s.assignment_ref = v_ca.storyboard_ref)
      OR (v_ca.assignment_type = 'free' AND s.assignment_ref = v_ca.free_theme_id)
    );

  RETURN jsonb_build_object(
    'class_name', v_class_name,
    'assignment_type', v_ca.assignment_type,
    'assignment_name', v_assignment_name,
    'image_url', v_image_url,
    'storyboard_ref', v_ca.storyboard_ref,
    'free_theme_id', v_ca.free_theme_id,
    'show_spots', v_show,
    'submissions', v_submissions
  );
END;
$$;

COMMIT;
