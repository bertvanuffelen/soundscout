-- 034_praatplaat_theme_update.sql
--
-- Testronde 5 / D2: de docent kan het thema-geluidenpalet van een praatplaat
-- kiezen (voorgevuld op het praatplaat-eigen thema). activate_praatplaat_from_catalog
-- zette theme_id alleen bij INSERT (find-or-create), dus een bestaande
-- (klas + afbeelding)-instance behield het oude thema wanneer de docent het
-- wijzigde. Deze migratie werkt theme_id (+ location_id + name) óók bij op de
-- gevonden rij, zodat een gewijzigde thema-keuze altijd doorwerkt.
--
-- Additief en idempotent: CREATE OR REPLACE. Verandert niets aan de find-or-
-- create-sleutel (class_id + teacher_id + image_url) of aan het RLS-model.

CREATE OR REPLACE FUNCTION activate_praatplaat_from_catalog(
  p_class_id UUID,
  p_name TEXT,
  p_theme_id TEXT,
  p_location_id TEXT,
  p_image_url TEXT,
  p_card_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher UUID := auth.uid();
  v_pp_id UUID;
BEGIN
  PERFORM check_rate_limit('activate_pp_catalog', v_teacher::text, 30, 60);

  -- Valideer ownership van klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = v_teacher
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  -- Find-or-create: één praatplaat-instance per (klas + afbeelding)
  SELECT id INTO v_pp_id
  FROM public.praatplaten
  WHERE class_id = p_class_id AND teacher_id = v_teacher AND image_url = p_image_url
  LIMIT 1;

  IF v_pp_id IS NULL THEN
    INSERT INTO public.praatplaten (class_id, teacher_id, name, theme_id, location_id, image_url, is_active)
    VALUES (p_class_id, v_teacher, p_name, p_theme_id, p_location_id, p_image_url, TRUE)
    RETURNING id INTO v_pp_id;
  ELSE
    -- Bestaande instance: neem de (mogelijk gewijzigde) thema-keuze over.
    UPDATE public.praatplaten
    SET theme_id = p_theme_id,
        location_id = p_location_id,
        name = p_name
    WHERE id = v_pp_id;
  END IF;

  -- Activeer via de idempotente assignment-upsert
  RETURN activate_assignment(p_class_id, NULL, v_pp_id, NULL, p_card_id);
END;
$$;
