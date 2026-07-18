-- Migration 033: Tijdsduur-vermelding op een opdracht (wens Bert testronde 1)
--
-- De docent kan optioneel een tijdsduur bij de actieve opdracht zetten
-- (bijv. "2 lessen" of "±30 minuten"). Puur een vermelding voor leerlingen:
-- de assignment-landing toont hem onder de opdrachtkaart. Geen timer.
--
-- - Kolom `duration_label` op class_assignments (docent beheert hem via de
--   bestaande UPDATE-RLS-policy uit migratie 006).
-- - get_active_assignment (laatst gedefinieerd in 028, mét peer_review):
--   het veld meegeven in de payload-JSONB van elke type-tak — JSONB-inhoud
--   wijzigen verandert het return-type niet, dus CREATE OR REPLACE volstaat
--   en oude clients negeren het veld.
--
-- Idempotent en additief. Uitvoeren in de Supabase SQL Editor.

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS duration_label TEXT
  CHECK (duration_label IS NULL OR char_length(duration_label) <= 60);

CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,
  payload         JSONB,
  card            JSONB,
  class_id        UUID,
  class_name      TEXT,
  peer_review     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 30, 60);

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
      || jsonb_build_object('duration_label', ca.duration_label)
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
$$;
