-- =============================================================================
-- 037 — Docentinstelling "Leerlingen mogen zelf een titel typen" (podium v4,
--       fase 3.1, besluit Bert 21-10-2026)
-- =============================================================================
--
-- Waarom: de titel van een soundscape is de enige vrije tekst die een leerling
-- in de klasroute invult. Daar kan een (achter)naam in staan (AVG). Staat deze
-- instelling uit, dan kiest de app automatisch een titel: geen invoerveld,
-- geen dobbelsteen.
--
-- Additief en veilig:
-- - nieuwe kolom met DEFAULT TRUE: bestaande opdrachten blijven zoals ze zijn;
-- - get_active_assignment geeft de waarde mee in `payload` (JSONB): het
--   teruggegeven type verandert niet, oudere apps negeren het veld;
-- - de docent zet hem om via de bestaande UPDATE-RLS-policy (migratie 006),
--   net als duration_label (033).
--
-- Body van get_active_assignment identiek aan migratie 036 (AUD-07), plus
-- 'students_type_title' in de payload.
-- =============================================================================

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS students_type_title BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.class_assignments.students_type_title IS
  'Podium v4: mogen leerlingen zelf een titel typen? FALSE = automatische titel (AVG).';

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
        'students_type_title', ca.students_type_title
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
