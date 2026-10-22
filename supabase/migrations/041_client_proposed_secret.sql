-- =============================================================================
-- 041 — Geen dubbele inzending na een time-out (eindtest H2, 21-10-2026)
-- =============================================================================
--
-- Probleem: de server mint het geheim pas bij de eerste inlevering en geeft
-- het éénmalig terug. Kwam dat antwoord niet aan (time-out op schoolwifi),
-- dan had de client geen geheim; de volgende poging werd geweigerd en viel
-- terug op een NIEUWE inzending, met een nieuwe schuilnaam.
--
-- Oplossing: de client stelt bij een nieuwe inzending zelf een geheim voor
-- en bewaart het vóór het versturen. De server neemt dat over.
-- Daarnaast: generate_save_secret gebruikt nu pgcrypto (gen_random_bytes)
-- in plaats van random().
--
-- Compatibel: oudere apps sturen bij een nieuwe inzending geen geheim mee en
-- krijgen, zoals nu, het servergeheim terug. Body verder identiek aan 036.
-- Idempotent.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_save_secret()
 RETURNS character varying
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  bytes BYTEA := extensions.gen_random_bytes(32);
  secret VARCHAR(32) := '';
  i INT;
BEGIN
  FOR i IN 0..31 LOOP
    secret := secret || substr(chars, (get_byte(bytes, i) % 62) + 1, 1);
  END LOOP;
  RETURN secret;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_save_secret() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_or_update_composition_v2(
  p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb,
  p_client_id uuid DEFAULT NULL::uuid, p_assignment_id uuid DEFAULT NULL::uuid,
  p_assignment_type text DEFAULT NULL::text, p_assignment_ref text DEFAULT NULL::text,
  p_praatplaat_position_x real DEFAULT NULL::real, p_praatplaat_position_y real DEFAULT NULL::real,
  p_save_secret character varying DEFAULT NULL::character varying)
 RETURNS TABLE(submission_id uuid, save_code character varying, save_secret character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_id UUID;
  v_existing public.submissions%ROWTYPE;
  v_new_id UUID;
  v_code VARCHAR(6);
  v_secret VARCHAR(32);
BEGIN
  -- Rate limit per klascode (was 60/min; een volle klas die tegelijk inlevert
  -- haalde dat — AUD-30)
  PERFORM check_rate_limit('submit_or_update', 'classcode:' || TRIM(p_class_code), 240, 60);

  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat', 'storyboard', 'free') THEN
    RAISE EXCEPTION 'Invalid assignment_type: %', p_assignment_type;
  END IF;

  SELECT c.id INTO v_class_id
  FROM public.classes c
  WHERE c.code = TRIM(p_class_code) AND c.is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden of niet actief';
  END IF;

  IF p_client_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.submissions s WHERE s.id = p_client_id FOR UPDATE;
  END IF;

  -- Bestaande inzending bijwerken mag alleen met bewijs van eigendom: zelfde
  -- klas én het geheim dat bij de eerste inlevering is meegegeven (AUD-01).
  -- Zonder dat bewijs: weigeren, en nooit de bewaarcode van de rij teruggeven.
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.class_id IS DISTINCT FROM v_class_id
       OR v_existing.save_secret IS NULL
       OR p_save_secret IS NULL
       OR v_existing.save_secret <> p_save_secret THEN
      RAISE EXCEPTION 'submission_forbidden' USING ERRCODE = '42501';
    END IF;

    UPDATE public.submissions s SET
      composition_name = p_composition_name,
      composition_data = p_composition_data,
      -- student_name bewust NIET bijwerken: de klas werkt anoniem met één
      -- vaste schuilnaam per inzending (AUD-27, besluit Bert 14-10)
      position_x = COALESCE(p_praatplaat_position_x, s.position_x),
      position_y = COALESCE(p_praatplaat_position_y, s.position_y),
      -- Eerste formele inlevering telt; blijft daarna staan
      submitted_at = COALESCE(s.submitted_at, NOW()),
      last_updated_at = NOW()
    WHERE s.id = v_existing.id;

    RETURN QUERY SELECT v_existing.id, v_existing.save_code, NULL::character varying;
    RETURN;
  END IF;

  -- Nieuwe inzending: bewaarcode + geheim minten en het geheim éénmalig
  -- teruggeven; de client bewaart het voor latere updates.
  -- 041 (H2): stelt de client zelf een geheim voor (32 tekens, vóór het
  -- versturen al bewaard), dan nemen we dat. Valt het antwoord weg door een
  -- time-out, dan heeft de client het geheim tóch en wordt de volgende poging
  -- een update in plaats van een tweede inzending.
  v_new_id := COALESCE(p_client_id, gen_random_uuid());
  v_code := generate_save_code();
  v_secret := CASE
    WHEN p_save_secret ~ '^[A-Za-z0-9]{32}$' THEN p_save_secret
    ELSE generate_save_secret()
  END;

  INSERT INTO public.submissions (
    id, class_id, student_name, composition_name, composition_data,
    assignment_id, assignment_type, assignment_ref,
    praatplaat_id, position_x, position_y,
    save_code, save_secret, submitted_at, last_updated_at
  )
  VALUES (
    v_new_id,
    v_class_id,
    COALESCE(NULLIF(TRIM(p_student_name), ''), 'Anoniem'),
    p_composition_name,
    p_composition_data,
    p_assignment_id,
    p_assignment_type,
    p_assignment_ref,
    CASE WHEN p_assignment_type = 'praatplaat' THEN p_assignment_id ELSE NULL END,
    p_praatplaat_position_x,
    p_praatplaat_position_y,
    v_code,
    v_secret,
    NOW(),
    NOW()
  );

  RETURN QUERY SELECT v_new_id, v_code, v_secret;
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_or_update_composition_v2(text, text, text, jsonb, uuid, uuid, text, text, real, real, character varying) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_or_update_composition_v2(text, text, text, jsonb, uuid, uuid, text, text, real, real, character varying) TO anon, authenticated, service_role;
