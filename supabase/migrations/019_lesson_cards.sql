-- ============================================
-- MIGRATIE 019: Leskaart-bibliotheek (lesson_cards)
-- Voer uit in Supabase SQL Editor (NA migratie 018)
-- ============================================
-- Een leskaart is een herbruikbaar "pakket" dat in één klik een volledige
-- opdracht voor een klas klaarzet: een opdracht-type + de bijbehorende resource
-- (template / praatplaat-catalogus / storyboard / vrij-thema) + een optionele
-- opdrachtkaart + presentatie-metadata (titel, niveau, lesdoel, fasen, cover, pdf).
--
-- ARCHITECTUUR — dunne preset (geen eigen content-store):
-- lesson_cards bewaart alléén de KEUZES. Bij activeren delegeert
-- activate_lesson_card naar de bestaande, idempotente activate_assignment /
-- activate_praatplaat_from_catalog (migraties 016-018). Zo is er één bron van
-- waarheid: class_assignments blijft de opdracht-instantie per klas; lesson_cards
-- is de herbruikbare definitie.
--
-- Twee soorten leskaarten:
--   * docent-eigen  : teacher_id = auth.uid(), builtin_key NULL
--   * ingebouwd     : teacher_id NULL, builtin_key gevuld (SQL-seed, migratie 020)
--
-- Opdrachtkaart: card_id (verwijst naar een docent-eigen assignment_cards-rij)
-- OF card_inline (JSONB titel+bullets, voor ingebouwde leskaarten die geen
-- docent-kaart kunnen bezitten). Bij activeren wordt card_inline find-or-create't
-- als docent-kaart.

-- ============================================
-- 1. TABEL: lesson_cards
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  builtin_key TEXT,

  -- Opdracht-type (discriminator, gelijk aan class_assignments)
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('template', 'praatplaat', 'storyboard', 'free')),

  -- Polymorfe resource-referenties (precies één set gevuld, per type)
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  praatplaat_ref TEXT,          -- catalogus-ref (label/dedup)
  pp_theme_id TEXT,             -- praatplaat: geluiden-thema
  pp_location_id TEXT,          -- praatplaat: locatie-/afbeeldings-id
  pp_image_url TEXT,            -- praatplaat: afbeelding (find-or-create-sleutel)
  storyboard_ref TEXT,          -- storyboard-registry-id
  free_theme_id TEXT,           -- vrij: thema-id

  -- Opdrachtkaart: verwijzing OF inline (max één)
  card_id UUID REFERENCES public.assignment_cards(id) ON DELETE SET NULL,
  card_inline JSONB,

  -- Presentatie-metadata (letterlijke tekst, zoals templates.name)
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  level TEXT,
  lesson_goal TEXT,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(phases) = 'array' AND jsonb_array_length(phases) <= 12),
  cover_image TEXT,
  pdf_url TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ingebouwd XOR docent-eigen
  CONSTRAINT lesson_cards_builtin_ownership CHECK (
    (teacher_id IS NULL AND builtin_key IS NOT NULL) OR
    (teacher_id IS NOT NULL AND builtin_key IS NULL)
  ),

  -- Precies één resource passend bij het type
  CONSTRAINT lesson_cards_one_resource CHECK (
    (assignment_type = 'template'   AND template_id    IS NOT NULL AND praatplaat_ref IS NULL AND storyboard_ref IS NULL AND free_theme_id IS NULL) OR
    (assignment_type = 'praatplaat' AND praatplaat_ref IS NOT NULL AND template_id    IS NULL AND storyboard_ref IS NULL AND free_theme_id IS NULL) OR
    (assignment_type = 'storyboard' AND storyboard_ref IS NOT NULL AND template_id    IS NULL AND praatplaat_ref IS NULL AND free_theme_id IS NULL) OR
    (assignment_type = 'free'       AND free_theme_id  IS NOT NULL AND template_id    IS NULL AND praatplaat_ref IS NULL AND storyboard_ref IS NULL)
  ),

  -- Hoogstens één opdrachtkaart-bron
  CONSTRAINT lesson_cards_one_card_source CHECK (
    NOT (card_id IS NOT NULL AND card_inline IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lesson_cards_teacher ON public.lesson_cards(teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_cards_builtin
  ON public.lesson_cards(builtin_key) WHERE builtin_key IS NOT NULL;

-- ============================================
-- 2. RLS: eigen kaarten + ingebouwde (lezen); alleen eigen (schrijven)
-- ============================================

ALTER TABLE public.lesson_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read own and builtin lesson cards" ON public.lesson_cards;
CREATE POLICY "Teachers can read own and builtin lesson cards"
  ON public.lesson_cards FOR SELECT
  USING (teacher_id = auth.uid() OR teacher_id IS NULL);

DROP POLICY IF EXISTS "Teachers can create own lesson cards" ON public.lesson_cards;
CREATE POLICY "Teachers can create own lesson cards"
  ON public.lesson_cards FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can update own lesson cards" ON public.lesson_cards;
CREATE POLICY "Teachers can update own lesson cards"
  ON public.lesson_cards FOR UPDATE
  USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can delete own lesson cards" ON public.lesson_cards;
CREATE POLICY "Teachers can delete own lesson cards"
  ON public.lesson_cards FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================
-- 3. RPC: activate_lesson_card — leskaart → opdracht voor een klas
-- ============================================
-- Valideert klas-ownership + leeskaart-toegang (eigen of ingebouwd), lost de
-- opdrachtkaart op (card_id direct / card_inline find-or-create / geen) en
-- delegeert type-geleid naar de bestaande activatie-RPC's.

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
    -- Inline kaart → find-or-create een docent-eigen assignment_cards-rij
    v_card_title := left(COALESCE(v_lc.card_inline->>'title', v_lc.title), 120);
    SELECT id INTO v_card_id
    FROM public.assignment_cards
    WHERE teacher_id = v_teacher AND title = v_card_title
    LIMIT 1;

    IF v_card_id IS NULL THEN
      INSERT INTO public.assignment_cards (teacher_id, title, bullets)
      VALUES (
        v_teacher,
        v_card_title,
        COALESCE(v_lc.card_inline->'bullets', '[]'::jsonb)
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
-- 4. updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION touch_lesson_cards_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_cards_updated_at ON public.lesson_cards;
CREATE TRIGGER trg_lesson_cards_updated_at
  BEFORE UPDATE ON public.lesson_cards
  FOR EACH ROW EXECUTE FUNCTION touch_lesson_cards_updated_at();

-- ============================================
-- 5. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION activate_lesson_card(UUID, UUID) TO authenticated;
