-- ============================================
-- MIGRATIE 023: Ingebouwde template-leskaart "Drum beat"
-- Voer uit in Supabase SQL Editor (NA migratie 022)
-- ============================================
-- Promoot de door de docent gebouwde template "Drum beat" tot een eigenaarloze
-- systeem-template (kopie: teacher_id NULL + builtin_key) en maakt er een
-- ingebouwde leskaart van. Zo verschijnt "Drum beat" als 4e ingebouwde leskaart
-- (type template) op landing + dashboard, activeerbaar door élke docent.
--
-- Idempotent: opnieuw draaien werkt de systeem-template + leskaart bij vanuit de
-- huidige bron-template. De originele docent-template blijft ongemoeid.
--
-- LET OP: zoekt de bron op NAAM. Draai deze migratie ná het opslaan van de
-- compositie als template met exact de naam 'Drum beat'.

DO $$
DECLARE
  v_src public.templates%ROWTYPE;
  v_sys_id UUID;
BEGIN
  -- 1. Bron: nieuwste docent-template met deze naam
  SELECT * INTO v_src
  FROM public.templates
  WHERE name = 'Drum beat' AND teacher_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bron-template "Drum beat" niet gevonden. Sla eerst de compositie op als template met exact deze naam.';
  END IF;

  -- 2. Systeem-template (kopie): find-or-update op builtin_key
  SELECT id INTO v_sys_id FROM public.templates WHERE builtin_key = 'drumbeat';

  IF v_sys_id IS NULL THEN
    INSERT INTO public.templates (
      teacher_id, builtin_key, name, description, composition_data,
      instructions, clips_locked, lock_options, is_active
    )
    VALUES (
      NULL, 'drumbeat', v_src.name, v_src.description, v_src.composition_data,
      v_src.instructions, v_src.clips_locked, v_src.lock_options, TRUE
    )
    RETURNING id INTO v_sys_id;
  ELSE
    UPDATE public.templates SET
      name = v_src.name,
      description = v_src.description,
      composition_data = v_src.composition_data,
      instructions = v_src.instructions,
      clips_locked = v_src.clips_locked,
      lock_options = v_src.lock_options
    WHERE id = v_sys_id;
  END IF;

  -- 3. Ingebouwde leskaart die naar de systeem-template verwijst
  INSERT INTO public.lesson_cards (
    builtin_key, assignment_type, template_id,
    card_inline, title, level, lesson_goal
  )
  VALUES (
    'drumbeat', 'template', v_sys_id,
    jsonb_build_object(
      'title', 'Zo werkt deze opdracht',
      'bullets', jsonb_build_array(
        'Je docent heeft alvast een ritme klaargezet.',
        'Luister goed en bouw erop verder.',
        'Sleep geluiden op de tijdlijn.',
        'Klaar? Sla je compositie op.'
      )
    ),
    'Drum beat', 'Alle groepen',
    'Leerlingen bouwen voort op een kant-en-klaar ritme en ontdekken hoe lagen en herhaling samen een beat maken.'
  )
  ON CONFLICT (builtin_key) WHERE builtin_key IS NOT NULL DO UPDATE SET
    assignment_type = EXCLUDED.assignment_type,
    template_id = EXCLUDED.template_id,
    card_inline = EXCLUDED.card_inline,
    title = EXCLUDED.title,
    level = EXCLUDED.level,
    lesson_goal = EXCLUDED.lesson_goal,
    updated_at = NOW();
END $$;
