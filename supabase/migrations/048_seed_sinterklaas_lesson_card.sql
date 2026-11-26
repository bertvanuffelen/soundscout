-- =============================================================================
-- 048 — Ingebouwde leskaart "Sinterklaas: hoe klinkt pakjesavond?"
--       (kant-en-klare les, wens Bert 26-11-2026). Draai NA 047.
-- =============================================================================
--
-- Eén klik op "Activeer" zet voor een klas de hele opdracht klaar:
--   type praatplaat · geluiden uit thema `sinterklaas` · plekken VERBORGEN
--   (de klas raadt de plek) · de leerlingkaart · tijdsduur "1 les".
--
-- LET OP — zichtbaarheid: zodra deze migratie gedraaid is, zien ALLE docenten
-- de leskaart in het tabblad Leskaarten (ingebouwde kaarten zijn voor iedereen
-- leesbaar). Draai deze migratie dus pas als het Sinterklaas-thema (manifest
-- `sinterklaas`) live staat. Bestaat het thema nog niet, dan breekt er niets:
-- de leerling verzamelt dan geluiden uit het standaardthema (basis).
--
-- DE PLAAT WISSELEN: pas alléén de regel `v_image` hieronder aan en draai de
-- migratie opnieuw (idempotent, ON CONFLICT builtin_key). Zet dezelfde waarde
-- in scripts/les-pages-data.json ("cover" bij key "sinterklaas"); de test
-- src/lib/__tests__/sinterklaasLessonCard.test.ts bewaakt dat ze gelijk zijn
-- en dat het bestand bestaat. Klassen die de les al geactiveerd hadden houden
-- hun oude plaat (één praatplaat per klas + afbeelding); opnieuw activeren
-- geeft de nieuwe.
--
-- Tekst is letterlijk Nederlands (zoals 020/023); de app toont de vertaling
-- uit lessonCards.builtin.sinterklaas (NL + EN).
-- =============================================================================

DO $$
DECLARE
  -- De praatplaat van deze les: het Sinterklaaspaleis (besluit Bert 26-11-2026).
  -- Versie 11, door Bert goedgekeurd op 26-11-2026 en definitief. Zelfde beeld als
  -- catalogus-entry `pp-sinterklaas-paleis` in src/data/praatplaatImages.ts.
  v_image CONSTANT TEXT := '/images/praatplaten/sinterklaaspaleis.jpg';
BEGIN
  INSERT INTO public.lesson_cards (
    builtin_key, assignment_type,
    praatplaat_ref, pp_theme_id, pp_location_id, pp_image_url,
    card_inline, title, level, lesson_goal, phases, cover_image,
    show_spots, duration_label
  )
  VALUES (
    'sinterklaas', 'praatplaat',
    'pp-sinterklaas', 'sinterklaas', 'pp-sinterklaas', v_image,
    jsonb_build_object(
      'title', 'Zo werkt deze opdracht',
      'bullets', jsonb_build_array(
        'Kies één plek op de plaat.',
        'Verzamel zes geluiden.',
        'Begin zacht en bouw op.',
        'Lever in. De klas raadt jouw plek.'
      )
    ),
    'Sinterklaas: hoe klinkt pakjesavond?', 'Groep 5–6',
    'Leerlingen maken een soundscape van één plek uit het Sinterklaasverhaal en ervaren hoe volgorde en lagen spanning opbouwen.',
    jsonb_build_array(
      jsonb_build_object('name', 'Oriënteren', 'text', 'Bekijk samen de plaat. Wat hoor je op elke plek?'),
      jsonb_build_object('name', 'Onderzoeken', 'text', 'Kies één plek. Verzamel zes geluiden die jij erbij vindt passen.'),
      jsonb_build_object('name', 'Uitvoeren', 'text', 'Begin zacht, bouw op in lagen en lever in.'),
      jsonb_build_object('name', 'Evalueren', 'text', 'De klas raadt de plek. Waar hoorde je dat aan?')
    ),
    v_image,
    FALSE, '1 les'
  )
  ON CONFLICT (builtin_key) WHERE builtin_key IS NOT NULL DO UPDATE SET
    assignment_type = EXCLUDED.assignment_type,
    praatplaat_ref = EXCLUDED.praatplaat_ref,
    pp_theme_id = EXCLUDED.pp_theme_id,
    pp_location_id = EXCLUDED.pp_location_id,
    pp_image_url = EXCLUDED.pp_image_url,
    card_inline = EXCLUDED.card_inline,
    title = EXCLUDED.title,
    level = EXCLUDED.level,
    lesson_goal = EXCLUDED.lesson_goal,
    phases = EXCLUDED.phases,
    cover_image = EXCLUDED.cover_image,
    show_spots = EXCLUDED.show_spots,
    duration_label = EXCLUDED.duration_label,
    updated_at = NOW();
END $$;
