-- ============================================
-- MIGRATION: CHECK CONSTRAINTS (TP0-3)
-- Voeg data validatie constraints toe aan alle tabellen
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TEACHERS - Tekst lengte limieten
-- ============================================
ALTER TABLE public.teachers
  ADD CONSTRAINT chk_teacher_email_length
    CHECK (char_length(email) BETWEEN 5 AND 255);

ALTER TABLE public.teachers
  ADD CONSTRAINT chk_teacher_display_name_length
    CHECK (char_length(display_name) BETWEEN 1 AND 100);

ALTER TABLE public.teachers
  ADD CONSTRAINT chk_teacher_school_name_length
    CHECK (school_name IS NULL OR char_length(school_name) BETWEEN 1 AND 200);

-- ============================================
-- 2. CLASSES - Naam lengte limiet
-- ============================================
ALTER TABLE public.classes
  ADD CONSTRAINT chk_class_name_length
    CHECK (char_length(name) BETWEEN 1 AND 100);

-- ============================================
-- 3. SUBMISSIONS - Data validatie
-- ============================================

-- Leerlingnaam: 1-100 karakters
ALTER TABLE public.submissions
  ADD CONSTRAINT chk_student_name_length
    CHECK (char_length(student_name) BETWEEN 1 AND 100);

-- Compositienaam: 1-200 karakters
ALTER TABLE public.submissions
  ADD CONSTRAINT chk_composition_name_length
    CHECK (char_length(composition_name) BETWEEN 1 AND 200);

-- Compositie data: max 1MB (voorkomt misbruik/DoS)
ALTER TABLE public.submissions
  ADD CONSTRAINT chk_composition_data_size
    CHECK (octet_length(composition_data::text) <= 1048576);

-- View count: niet negatief
ALTER TABLE public.submissions
  ADD CONSTRAINT chk_view_count_positive
    CHECK (view_count >= 0);

-- ============================================
-- KLAAR!
-- ============================================
-- Als je "Success. No rows returned" ziet, is alles goed gegaan.
-- Bestaande data die niet aan de constraints voldoet zal een error geven.
