-- ============================================
-- MIGRATIE 016: Opdrachtkaart-bibliotheek (Feature B)
-- Voer uit in Supabase SQL Editor (NA migratie 015)
-- ============================================
-- Een opdrachtkaart is een vorm-onafhankelijke instructiekaart (titel + max ~10
-- bullets) die de leerling ziet ná klascode-invoer. Docenten stellen kaarten
-- samen, bewaren ze in een herbruikbare bibliotheek (assignment_cards, zoals
-- templates) en koppelen er één aan de actieve opdracht via
-- class_assignments.card_id.
--
-- De kaart hangt aan de OPDRACHT (class_assignments), niet aan het type of de
-- resource → werkt voor template, praatplaat én storyboard, herbruikbaar over
-- klassen heen. card_id NULL → de client toont een per-type default-kaart.
--
-- AUTORITATIEF: deze migratie bevat de eindversie van activate_assignment en
-- get_active_assignment (samengevoegd met de storyboard-uitbreiding uit 015).
-- Houd deze twee functies consistent met 015 bij toekomstige wijzigingen.

-- ============================================
-- 1. TABEL: assignment_cards
-- ============================================

CREATE TABLE IF NOT EXISTS public.assignment_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  bullets JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(bullets) = 'array' AND jsonb_array_length(bullets) <= 10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_cards_teacher ON public.assignment_cards(teacher_id);

-- ============================================
-- 2. RLS: docent-eigen data (zoals templates/praatplaten)
-- ============================================

ALTER TABLE public.assignment_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read own assignment cards" ON public.assignment_cards;
CREATE POLICY "Teachers can read own assignment cards"
  ON public.assignment_cards FOR SELECT
  USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can create assignment cards" ON public.assignment_cards;
CREATE POLICY "Teachers can create assignment cards"
  ON public.assignment_cards FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can update own assignment cards" ON public.assignment_cards;
CREATE POLICY "Teachers can update own assignment cards"
  ON public.assignment_cards FOR UPDATE
  USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can delete own assignment cards" ON public.assignment_cards;
CREATE POLICY "Teachers can delete own assignment cards"
  ON public.assignment_cards FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================
-- 3. CLASS_ASSIGNMENTS: koppeling naar de opdrachtkaart
-- ============================================
-- ON DELETE SET NULL: een kaart uit de bibliotheek verwijderen laat lopende
-- opdrachten intact (ze vallen terug op de per-type default-kaart).

ALTER TABLE public.class_assignments
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.assignment_cards(id) ON DELETE SET NULL;

-- ============================================
-- 4. RPC: OPDRACHT ACTIVEREN — eindversie (+ p_card_id)
-- ============================================
-- Vervangt de 4-arg-variant uit migratie 015. Drop eerst om overload-
-- ambiguïteit te vermijden.

DROP FUNCTION IF EXISTS activate_assignment(UUID, UUID, UUID, TEXT);

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

  -- Insert (trigger deactiveert de rest automatisch)
  INSERT INTO public.class_assignments (
    class_id, teacher_id, assignment_type, template_id, praatplaat_id, storyboard_ref, card_id, is_active
  )
  VALUES (
    p_class_id, auth.uid(), v_type, p_template_id, p_praatplaat_id, p_storyboard_ref, p_card_id, TRUE
  )
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- ============================================
-- 5. RPC: ACTIEVE OPDRACHT OPHALEN — eindversie (+ card)
-- ============================================
-- Vult het `card`-veld vanaf de gekoppelde assignment_cards-rij (of NULL →
-- client toont per-type default). Return-vorm identiek aan 015; alleen de
-- card-inhoud wordt nu daadwerkelijk gevuld.

DROP FUNCTION IF EXISTS get_active_assignment(TEXT);

CREATE OR REPLACE FUNCTION get_active_assignment(p_class_code TEXT)
RETURNS TABLE (
  assignment_type TEXT,
  payload         JSONB,
  card            JSONB,
  class_id        UUID,
  class_name      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 30, 60);

  RETURN QUERY
  SELECT
    ca.assignment_type,
    CASE ca.assignment_type
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
    END AS payload,
    CASE
      WHEN ca.card_id IS NOT NULL THEN jsonb_build_object(
        'title', ac.title,
        'bullets', ac.bullets
      )
      ELSE NULL
    END AS card,
    c.id AS class_id,
    c.name AS class_name
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  LEFT JOIN public.templates t ON t.id = ca.template_id
  LEFT JOIN public.teachers te ON te.id = t.teacher_id
  LEFT JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  LEFT JOIN public.assignment_cards ac ON ac.id = ca.card_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$$;

-- ============================================
-- 6. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_active_assignment(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_assignment(UUID, UUID, UUID, TEXT, UUID) TO authenticated;
