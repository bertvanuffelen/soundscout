-- ============================================
-- MIGRATIE 020: Seed ingebouwde leskaarten
-- Voer uit in Supabase SQL Editor (NA migratie 019)
-- ============================================
-- Drie ingebouwde leskaarten (teacher_id NULL, builtin_key gevuld). Elke docent
-- ziet deze naast zijn eigen leskaarten en kan ze in één klik activeren.
-- Idempotent: opnieuw draaien werkt de bestaande rijen bij (ON CONFLICT builtin_key).
--
-- Refs verwijzen naar bestaande app-content:
--   * pp-robotfabriek → src/data/praatplaatImages.ts (thema basis)
--   * verspringen     → src/data/storyboards.ts (thema basis)
--   * basis           → src/data/themes (vrij thema)
--
-- Tekst is letterlijk (Nederlands), zoals templates/praatplaten. De metadata
-- spiegelt de landingspagina (teacherLanding.lessons.robotfactory.*).

-- 1. Robotfabriek — praatplaat (volledig uitgewerkt)
INSERT INTO public.lesson_cards (
  builtin_key, assignment_type,
  praatplaat_ref, pp_theme_id, pp_location_id, pp_image_url,
  card_inline, title, level, lesson_goal, phases, cover_image
)
VALUES (
  'robotfabriek', 'praatplaat',
  'pp-robotfabriek', 'basis', 'pp-robotfabriek', '/images/praatplaten/robotfabriek.jpg',
  jsonb_build_object(
    'title', 'Zo werkt deze opdracht',
    'bullets', jsonb_build_array(
      'Je kiest straks een plek op de afbeelding.',
      'Verzamel geluiden op de kaart.',
      'Maak muziek die bij jouw plek past.',
      'Klaar? Sla je compositie op.'
    )
  ),
  'Robotfabriek', 'Groep 6–7',
  'Leerlingen verklanken samen een element uit één beeld en ervaren hoe herhaling, laagopbouw en vorm een sfeer maken.',
  jsonb_build_array(
    jsonb_build_object('name', 'Oriënteren', 'text', 'klassikaal gesprek; tweetallen kiezen een plek.'),
    jsonb_build_object('name', 'Onderzoeken', 'text', 'geluiden verzamelen en in de studio componeren.'),
    jsonb_build_object('name', 'Uitvoeren', 'text', 'inleveren en klassikaal laten klinken.'),
    jsonb_build_object('name', 'Evalueren', 'text', 'samen nabespreken.')
  ),
  '/images/praatplaten/robotfabriek.jpg'
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
  updated_at = NOW();

-- 2. Verspringen — storyboard
INSERT INTO public.lesson_cards (
  builtin_key, assignment_type,
  storyboard_ref,
  card_inline, title, level, lesson_goal, cover_image
)
VALUES (
  'verspringen', 'storyboard',
  'verspringen',
  jsonb_build_object(
    'title', 'Zo werkt deze opdracht',
    'bullets', jsonb_build_array(
      'Bekijk de scènes van het verhaal.',
      'Verzamel geluiden op de kaart.',
      'Maak muziek die bij elke scène past.',
      'Klaar? Sla je compositie op.'
    )
  ),
  'Verspringen', 'Groep 5–8',
  'Leerlingen maken een soundtrack per scène en ervaren hoe muziek een verhaal in beeld ondersteunt.',
  '/images/storyboards/verspringen/verspringen-2.jpg'
)
ON CONFLICT (builtin_key) WHERE builtin_key IS NOT NULL DO UPDATE SET
  assignment_type = EXCLUDED.assignment_type,
  storyboard_ref = EXCLUDED.storyboard_ref,
  card_inline = EXCLUDED.card_inline,
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  lesson_goal = EXCLUDED.lesson_goal,
  cover_image = EXCLUDED.cover_image,
  updated_at = NOW();

-- 3. Vrij componeren — vrije compositie (thema basis)
INSERT INTO public.lesson_cards (
  builtin_key, assignment_type,
  free_theme_id,
  card_inline, title, level, lesson_goal, cover_image
)
VALUES (
  'vrij-basis', 'free',
  'basis',
  jsonb_build_object(
    'title', 'Zo werkt deze opdracht',
    'bullets', jsonb_build_array(
      'Verzamel geluiden op de kaart.',
      'Experimenteer met de klanken.',
      'Maak je eigen compositie.',
      'Klaar? Sla je compositie op.'
    )
  ),
  'Vrij componeren', 'Alle groepen',
  'Leerlingen verkennen vrij de geluiden van een thema en maken hun eigen compositie — puur gericht op klank.',
  '/images/themes/basis/plattegrond.jpg'
)
ON CONFLICT (builtin_key) WHERE builtin_key IS NOT NULL DO UPDATE SET
  assignment_type = EXCLUDED.assignment_type,
  free_theme_id = EXCLUDED.free_theme_id,
  card_inline = EXCLUDED.card_inline,
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  lesson_goal = EXCLUDED.lesson_goal,
  cover_image = EXCLUDED.cover_image,
  updated_at = NOW();
