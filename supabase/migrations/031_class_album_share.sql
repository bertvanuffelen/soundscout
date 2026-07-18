-- ============================================
-- MIGRATIE 031: Klas-album — deelbare afspeellijst per klas-opdracht (R4)
-- Voer uit in Supabase SQL Editor
-- ============================================
-- De docent deelt één klas-opdracht (elk type) als "album": een 8-karakter
-- code die publiek alle formeel ingeleverde composities van die opdracht
-- toont in het presentatiescherm (bij praatplaat-opdrachten als klikbaar
-- bord). Patroon = migratie 012 (praatplaat-share): code + verloop +
-- view-count, docent-RPC om te delen, anon-RPC om te lezen.
-- Additief & idempotent.

-- ============================================
-- 1. NIEUWE KOLOMMEN OP CLASS_ASSIGNMENTS
-- ============================================

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS share_code VARCHAR(8) UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_view_count INT DEFAULT 0
    CONSTRAINT chk_album_share_view_count_positive CHECK (share_view_count >= 0);

CREATE INDEX IF NOT EXISTS idx_class_assignments_share_code
  ON public.class_assignments(share_code) WHERE share_code IS NOT NULL;

-- ============================================
-- 2. CENTRALE 8-CHAR CODEGENERATOR
-- ============================================
-- Eén generator die tegen ALLE drie de 8-char-codespaces checkt
-- (submissions, praatplaten, class_assignments), zodat de client-side
-- fallback-keten (template → share → praatplaat → album) nooit een code
-- dubbel kan matchen.

CREATE OR REPLACE FUNCTION generate_share_code_v2()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(8) := '';
  code_exists BOOLEAN;
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(
      SELECT 1 FROM public.submissions WHERE share_code = new_code
      UNION ALL
      SELECT 1 FROM public.praatplaten WHERE share_code = new_code
      UNION ALL
      SELECT 1 FROM public.class_assignments WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- De bestaande praatplaat-generator gaat óók de album-ruimte checken
-- (zelfde gedrag, bredere collision-check).
CREATE OR REPLACE FUNCTION generate_praatplaat_share_code()
RETURNS VARCHAR(8) AS $$
BEGIN
  RETURN generate_share_code_v2();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. RPC: ALBUM DELEN (docenten)
-- ============================================

CREATE OR REPLACE FUNCTION share_class_album(p_assignment_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
BEGIN
  -- Rate limit: 10 per minuut per docent
  PERFORM check_rate_limit('share_class_album', auth.uid()::text, 10, 60);

  -- Valideer: docent is eigenaar van de opdracht
  SELECT share_code INTO v_code
  FROM public.class_assignments
  WHERE id = p_assignment_id AND teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opdracht niet gevonden of geen toegang';
  END IF;

  v_expires := NOW() + INTERVAL '30 days';

  IF v_code IS NOT NULL THEN
    UPDATE public.class_assignments
    SET share_expires_at = v_expires
    WHERE id = p_assignment_id;
    RETURN v_code;
  ELSE
    v_code := generate_share_code_v2();
    UPDATE public.class_assignments
    SET share_code = v_code,
        share_expires_at = v_expires,
        share_view_count = 0
    WHERE id = p_assignment_id;
    RETURN v_code;
  END IF;
END;
$$;

-- ============================================
-- 4. RPC: GEDEELD ALBUM OPHALEN (publiek)
-- ============================================
-- Submissions worden per opdracht-type geresolved (er is geen FK van
-- submissions naar class_assignments; de koppeling loopt via class_id +
-- de resource-referentie, zoals submit_or_update_composition_v2 ze zet):
--   praatplaat → s.praatplaat_id (of assignment_id) = ca.praatplaat_id
--   template   → s.assignment_id  = ca.template_id
--   storyboard → s.assignment_ref = ca.storyboard_ref
--   free       → s.assignment_ref = ca.free_theme_id
-- Alleen formeel ingeleverde composities (submitted_at IS NOT NULL).

CREATE OR REPLACE FUNCTION get_shared_class_album(p_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ca RECORD;
  v_class_name TEXT;
  v_assignment_name TEXT;
  v_image_url TEXT;
  v_submissions JSONB;
BEGIN
  -- Rate limit: 30 per minuut per code
  PERFORM check_rate_limit('get_shared_class_album', 'alb:' || p_code, 30, 60);

  SELECT ca.id, ca.class_id, ca.assignment_type, ca.template_id, ca.praatplaat_id,
         ca.storyboard_ref, ca.free_theme_id, ca.share_expires_at
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
      'composition_data', s.composition_data,
      'position_x', s.position_x,
      'position_y', s.position_y,
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
    'submissions', v_submissions
  );
END;
$$;

-- ============================================
-- 5. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_shared_class_album(VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION share_class_album(UUID) TO authenticated;
