-- TABLES

-- ====
CREATE TABLE public.assignment_cards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  bullets jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_derived boolean DEFAULT false NOT NULL
);
CREATE TABLE public.class_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  template_id uuid,
  praatplaat_id uuid,
  is_active boolean DEFAULT true,
  activated_at timestamp with time zone DEFAULT now(),
  assignment_type text NOT NULL,
  storyboard_ref text,
  card_id uuid,
  free_theme_id text,
  peer_review_enabled boolean DEFAULT false NOT NULL,
  feedback_card_id uuid,
  peer_review_closes_at timestamp with time zone,
  share_code character varying(8),
  share_expires_at timestamp with time zone,
  share_view_count integer DEFAULT 0,
  duration_label text
);
CREATE TABLE public.classes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  code character(4) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);
CREATE TABLE public.feedback_cards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid,
  builtin_key text,
  title text NOT NULL,
  chips text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lesson_cards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid,
  builtin_key text,
  assignment_type text NOT NULL,
  template_id uuid,
  praatplaat_ref text,
  pp_theme_id text,
  pp_location_id text,
  pp_image_url text,
  storyboard_ref text,
  free_theme_id text,
  card_id uuid,
  card_inline jsonb,
  title text NOT NULL,
  level text,
  lesson_goal text,
  phases jsonb DEFAULT '[]'::jsonb NOT NULL,
  cover_image text,
  pdf_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.peer_feedback (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  submission_id uuid NOT NULL,
  from_submission_id uuid NOT NULL,
  chips text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  ratings jsonb
);
CREATE TABLE public.praatplaten (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid,
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  theme_id text NOT NULL,
  location_id text NOT NULL,
  image_url text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  share_code character varying(8),
  share_expires_at timestamp with time zone,
  share_view_count integer DEFAULT 0
);
CREATE TABLE public.rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  action text NOT NULL,
  identifier text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid,
  student_name text NOT NULL,
  composition_name text NOT NULL,
  composition_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  share_code character varying(8),
  expires_at timestamp with time zone,
  view_count integer DEFAULT 0,
  save_code character varying(6),
  save_secret character varying(32),
  last_updated_at timestamp with time zone,
  student_email text,
  praatplaat_id uuid,
  position_x real,
  position_y real,
  assignment_id uuid,
  assignment_type text,
  assignment_ref text,
  feedback_sticker text,
  feedback_level smallint,
  feedback_text text,
  feedback_at timestamp with time zone,
  teacher_seen_at timestamp with time zone,
  submitted_at timestamp with time zone
);
CREATE TABLE public.teachers (
  id uuid NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  school_name text,
  created_at timestamp with time zone DEFAULT now(),
  max_classes integer DEFAULT 8
);
CREATE TABLE public.templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid,
  name text NOT NULL,
  description text,
  code character varying(8) NOT NULL,
  composition_data jsonb NOT NULL,
  instructions text,
  clips_locked boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  lock_options jsonb,
  builtin_key text
);
CREATE TABLE public.usage_stats (
  event text NOT NULL,
  day date DEFAULT CURRENT_DATE NOT NULL,
  count bigint DEFAULT 0 NOT NULL
);

-- ====
-- CONSTRAINTS

-- ====
ALTER TABLE public.assignment_cards ADD CONSTRAINT assignment_cards_bullets_check CHECK (((jsonb_typeof(bullets) = 'array'::text) AND (jsonb_array_length(bullets) <= 10)));
ALTER TABLE public.assignment_cards ADD CONSTRAINT assignment_cards_pkey PRIMARY KEY (id);
ALTER TABLE public.assignment_cards ADD CONSTRAINT assignment_cards_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 120)));
ALTER TABLE public.class_assignments ADD CONSTRAINT chk_album_share_view_count_positive CHECK ((share_view_count >= 0));
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_duration_label_check CHECK (((duration_label IS NULL) OR (char_length(duration_label) <= 60)));
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_share_code_key UNIQUE (share_code);
ALTER TABLE public.class_assignments ADD CONSTRAINT one_assignment_type CHECK ((((assignment_type = 'template'::text) AND (template_id IS NOT NULL) AND (praatplaat_id IS NULL) AND (storyboard_ref IS NULL) AND (free_theme_id IS NULL)) OR ((assignment_type = 'praatplaat'::text) AND (praatplaat_id IS NOT NULL) AND (template_id IS NULL) AND (storyboard_ref IS NULL) AND (free_theme_id IS NULL)) OR ((assignment_type = 'storyboard'::text) AND (storyboard_ref IS NOT NULL) AND (template_id IS NULL) AND (praatplaat_id IS NULL) AND (free_theme_id IS NULL)) OR ((assignment_type = 'free'::text) AND (free_theme_id IS NOT NULL) AND (template_id IS NULL) AND (praatplaat_id IS NULL) AND (storyboard_ref IS NULL))));
ALTER TABLE public.classes ADD CONSTRAINT chk_class_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100)));
ALTER TABLE public.classes ADD CONSTRAINT classes_code_key UNIQUE (code);
ALTER TABLE public.classes ADD CONSTRAINT classes_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_cards ADD CONSTRAINT feedback_cards_builtin_key_key UNIQUE (builtin_key);
ALTER TABLE public.feedback_cards ADD CONSTRAINT feedback_cards_builtin_ownership CHECK ((((teacher_id IS NULL) AND (builtin_key IS NOT NULL)) OR ((teacher_id IS NOT NULL) AND (builtin_key IS NULL))));
ALTER TABLE public.feedback_cards ADD CONSTRAINT feedback_cards_chips_check CHECK (((cardinality(chips) >= 2) AND (cardinality(chips) <= 8)));
ALTER TABLE public.feedback_cards ADD CONSTRAINT feedback_cards_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_cards ADD CONSTRAINT feedback_cards_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 80)));
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['template'::text, 'praatplaat'::text, 'storyboard'::text, 'free'::text])));
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_builtin_ownership CHECK ((((teacher_id IS NULL) AND (builtin_key IS NOT NULL)) OR ((teacher_id IS NOT NULL) AND (builtin_key IS NULL))));
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_one_card_source CHECK ((NOT ((card_id IS NOT NULL) AND (card_inline IS NOT NULL))));
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_one_resource CHECK ((((assignment_type = 'template'::text) AND (template_id IS NOT NULL) AND (praatplaat_ref IS NULL) AND (storyboard_ref IS NULL) AND (free_theme_id IS NULL)) OR ((assignment_type = 'praatplaat'::text) AND (praatplaat_ref IS NOT NULL) AND (template_id IS NULL) AND (storyboard_ref IS NULL) AND (free_theme_id IS NULL)) OR ((assignment_type = 'storyboard'::text) AND (storyboard_ref IS NOT NULL) AND (template_id IS NULL) AND (praatplaat_ref IS NULL) AND (free_theme_id IS NULL)) OR ((assignment_type = 'free'::text) AND (free_theme_id IS NOT NULL) AND (template_id IS NULL) AND (praatplaat_ref IS NULL) AND (storyboard_ref IS NULL))));
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_phases_check CHECK (((jsonb_typeof(phases) = 'array'::text) AND (jsonb_array_length(phases) <= 12)));
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_pkey PRIMARY KEY (id);
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 160)));
ALTER TABLE public.peer_feedback ADD CONSTRAINT peer_feedback_chips_check CHECK (((cardinality(chips) >= 1) AND (cardinality(chips) <= 3)));
ALTER TABLE public.peer_feedback ADD CONSTRAINT peer_feedback_not_self CHECK ((submission_id <> from_submission_id));
ALTER TABLE public.peer_feedback ADD CONSTRAINT peer_feedback_once_per_pair UNIQUE (submission_id, from_submission_id);
ALTER TABLE public.peer_feedback ADD CONSTRAINT peer_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.praatplaten ADD CONSTRAINT chk_share_view_count_positive CHECK ((share_view_count >= 0));
ALTER TABLE public.praatplaten ADD CONSTRAINT praatplaten_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 200)));
ALTER TABLE public.praatplaten ADD CONSTRAINT praatplaten_pkey PRIMARY KEY (id);
ALTER TABLE public.praatplaten ADD CONSTRAINT praatplaten_share_code_key UNIQUE (share_code);
ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.submissions ADD CONSTRAINT chk_composition_data_size CHECK ((octet_length((composition_data)::text) <= 1048576));
ALTER TABLE public.submissions ADD CONSTRAINT chk_composition_name_length CHECK (((char_length(composition_name) >= 1) AND (char_length(composition_name) <= 200)));
ALTER TABLE public.submissions ADD CONSTRAINT chk_student_name_length CHECK (((char_length(student_name) >= 1) AND (char_length(student_name) <= 100)));
ALTER TABLE public.submissions ADD CONSTRAINT chk_view_count_positive CHECK ((view_count >= 0));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_assignment_type_check CHECK (((assignment_type IS NULL) OR (assignment_type = ANY (ARRAY['template'::text, 'praatplaat'::text, 'storyboard'::text, 'free'::text]))));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_feedback_level_check CHECK (((feedback_level IS NULL) OR ((feedback_level >= 1) AND (feedback_level <= 3))));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_feedback_sticker_check CHECK (((feedback_sticker IS NULL) OR (feedback_sticker = ANY (ARRAY['star'::text, 'rhythm'::text, 'build'::text, 'teamwork'::text, 'surprise'::text, 'target'::text]))));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_feedback_text_check CHECK (((feedback_text IS NULL) OR (char_length(feedback_text) <= 300)));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);
ALTER TABLE public.submissions ADD CONSTRAINT submissions_position_x_check CHECK (((position_x IS NULL) OR ((position_x >= (0)::double precision) AND (position_x <= (1)::double precision))));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_position_y_check CHECK (((position_y IS NULL) OR ((position_y >= (0)::double precision) AND (position_y <= (1)::double precision))));
ALTER TABLE public.submissions ADD CONSTRAINT submissions_save_code_key UNIQUE (save_code);
ALTER TABLE public.submissions ADD CONSTRAINT submissions_share_code_key UNIQUE (share_code);
ALTER TABLE public.teachers ADD CONSTRAINT chk_teacher_display_name_length CHECK (((char_length(display_name) >= 1) AND (char_length(display_name) <= 100)));
ALTER TABLE public.teachers ADD CONSTRAINT chk_teacher_email_length CHECK (((char_length(email) >= 5) AND (char_length(email) <= 255)));
ALTER TABLE public.teachers ADD CONSTRAINT chk_teacher_school_name_length CHECK (((school_name IS NULL) OR ((char_length(school_name) >= 1) AND (char_length(school_name) <= 200))));
ALTER TABLE public.teachers ADD CONSTRAINT teachers_email_key UNIQUE (email);
ALTER TABLE public.teachers ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);
ALTER TABLE public.templates ADD CONSTRAINT chk_template_data_size CHECK ((octet_length((composition_data)::text) <= 1048576));
ALTER TABLE public.templates ADD CONSTRAINT chk_template_description_length CHECK (((description IS NULL) OR (char_length(description) <= 1000)));
ALTER TABLE public.templates ADD CONSTRAINT chk_template_instructions_length CHECK (((instructions IS NULL) OR (char_length(instructions) <= 5000)));
ALTER TABLE public.templates ADD CONSTRAINT chk_template_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 200)));
ALTER TABLE public.templates ADD CONSTRAINT templates_builtin_ownership CHECK ((((teacher_id IS NULL) AND (builtin_key IS NOT NULL)) OR ((teacher_id IS NOT NULL) AND (builtin_key IS NULL))));
ALTER TABLE public.templates ADD CONSTRAINT templates_code_key UNIQUE (code);
ALTER TABLE public.templates ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
ALTER TABLE public.usage_stats ADD CONSTRAINT usage_stats_pkey PRIMARY KEY (event, day);
ALTER TABLE public.assignment_cards ADD CONSTRAINT assignment_cards_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_card_id_fkey FOREIGN KEY (card_id) REFERENCES assignment_cards(id) ON DELETE SET NULL;
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_feedback_card_id_fkey FOREIGN KEY (feedback_card_id) REFERENCES feedback_cards(id) ON DELETE SET NULL;
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_praatplaat_id_fkey FOREIGN KEY (praatplaat_id) REFERENCES praatplaten(id) ON DELETE CASCADE;
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.class_assignments ADD CONSTRAINT class_assignments_template_id_fkey FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
ALTER TABLE public.classes ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.feedback_cards ADD CONSTRAINT feedback_cards_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES assignment_cards(id) ON DELETE SET NULL;
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_cards ADD CONSTRAINT lesson_cards_template_id_fkey FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE public.peer_feedback ADD CONSTRAINT peer_feedback_from_submission_id_fkey FOREIGN KEY (from_submission_id) REFERENCES submissions(id) ON DELETE CASCADE;
ALTER TABLE public.peer_feedback ADD CONSTRAINT peer_feedback_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;
ALTER TABLE public.praatplaten ADD CONSTRAINT praatplaten_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE public.praatplaten ADD CONSTRAINT praatplaten_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_praatplaat_id_fkey FOREIGN KEY (praatplaat_id) REFERENCES praatplaten(id) ON DELETE CASCADE;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.templates ADD CONSTRAINT templates_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- ====
-- INDEXES

-- ====
CREATE UNIQUE INDEX idx_class_assignments_active ON public.class_assignments USING btree (class_id) WHERE (is_active = true);
CREATE INDEX idx_assignment_cards_teacher ON public.assignment_cards USING btree (teacher_id);
CREATE INDEX idx_class_assignments_teacher ON public.class_assignments USING btree (teacher_id);
CREATE INDEX idx_class_assignments_class ON public.class_assignments USING btree (class_id);
CREATE INDEX idx_templates_code ON public.templates USING btree (code);
CREATE UNIQUE INDEX idx_class_assignments_uniq_free ON public.class_assignments USING btree (class_id, free_theme_id) WHERE (free_theme_id IS NOT NULL);
CREATE INDEX idx_submissions_save_code ON public.submissions USING btree (save_code) WHERE (save_code IS NOT NULL);
CREATE UNIQUE INDEX idx_class_assignments_uniq_praatplaat ON public.class_assignments USING btree (class_id, praatplaat_id) WHERE (praatplaat_id IS NOT NULL);
CREATE INDEX idx_classes_code ON public.classes USING btree (code);
CREATE INDEX idx_class_assignments_share_code ON public.class_assignments USING btree (share_code) WHERE (share_code IS NOT NULL);
CREATE INDEX idx_classes_teacher ON public.classes USING btree (teacher_id);
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits USING btree (action, identifier, created_at DESC);
CREATE INDEX idx_praatplaten_class ON public.praatplaten USING btree (class_id);
CREATE INDEX idx_lesson_cards_teacher ON public.lesson_cards USING btree (teacher_id);
CREATE INDEX idx_submissions_praatplaat ON public.submissions USING btree (praatplaat_id) WHERE (praatplaat_id IS NOT NULL);
CREATE UNIQUE INDEX idx_lesson_cards_builtin ON public.lesson_cards USING btree (builtin_key) WHERE (builtin_key IS NOT NULL);
CREATE INDEX idx_templates_teacher ON public.templates USING btree (teacher_id);
CREATE INDEX idx_submissions_assignment ON public.submissions USING btree (assignment_id) WHERE (assignment_id IS NOT NULL);
CREATE INDEX idx_praatplaten_teacher ON public.praatplaten USING btree (teacher_id);
CREATE UNIQUE INDEX idx_class_assignments_uniq_storyboard ON public.class_assignments USING btree (class_id, storyboard_ref) WHERE (storyboard_ref IS NOT NULL);
CREATE INDEX idx_templates_active ON public.templates USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_submissions_class ON public.submissions USING btree (class_id);
CREATE UNIQUE INDEX idx_class_assignments_uniq_template ON public.class_assignments USING btree (class_id, template_id) WHERE (template_id IS NOT NULL);
CREATE INDEX idx_peer_feedback_submission ON public.peer_feedback USING btree (submission_id);
CREATE INDEX idx_submissions_created ON public.submissions USING btree (created_at DESC);
CREATE INDEX idx_submissions_share_code ON public.submissions USING btree (share_code) WHERE (share_code IS NOT NULL);
CREATE UNIQUE INDEX idx_templates_builtin ON public.templates USING btree (builtin_key) WHERE (builtin_key IS NOT NULL);
CREATE INDEX idx_praatplaten_share_code ON public.praatplaten USING btree (share_code) WHERE (share_code IS NOT NULL);

-- ====
-- RLS

-- ====
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.praatplaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

-- ====
-- POLICIES

-- ====
CREATE POLICY "Teachers can create assignment cards" ON public.assignment_cards AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete own assignment cards" ON public.assignment_cards AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can read own assignment cards" ON public.assignment_cards AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update own assignment cards" ON public.assignment_cards AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can create class assignments" ON public.class_assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete own class assignments" ON public.class_assignments AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can read own class assignments" ON public.class_assignments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update own class assignments" ON public.class_assignments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Anyone can lookup class by code" ON public.classes AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Teachers can create classes" ON public.classes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete own classes" ON public.classes AS PERMISSIVE FOR DELETE TO public USING ((teacher_id = auth.uid()));
CREATE POLICY "Teachers can insert own classes" ON public.classes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY "Teachers can read own classes" ON public.classes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update own classes" ON public.classes AS PERMISSIVE FOR UPDATE TO public USING ((teacher_id = auth.uid()));
CREATE POLICY "Teachers can view own classes" ON public.classes AS PERMISSIVE FOR SELECT TO public USING ((teacher_id = auth.uid()));
CREATE POLICY "Teachers create own feedback cards" ON public.feedback_cards AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY "Teachers delete own feedback cards" ON public.feedback_cards AS PERMISSIVE FOR DELETE TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY "Teachers read own and builtin feedback cards" ON public.feedback_cards AS PERMISSIVE FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR (teacher_id IS NULL)));
CREATE POLICY "Teachers update own feedback cards" ON public.feedback_cards AS PERMISSIVE FOR UPDATE TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY "Teachers can create own lesson cards" ON public.lesson_cards AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete own lesson cards" ON public.lesson_cards AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can read own and builtin lesson cards" ON public.lesson_cards AS PERMISSIVE FOR SELECT TO public USING (((teacher_id = auth.uid()) OR (teacher_id IS NULL)));
CREATE POLICY "Teachers can update own lesson cards" ON public.lesson_cards AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers read peer feedback of own classes" ON public.peer_feedback AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (submissions s
     JOIN classes c ON ((c.id = s.class_id)))
  WHERE ((s.id = peer_feedback.submission_id) AND (c.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can create praatplaten" ON public.praatplaten AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete own praatplaten" ON public.praatplaten AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can read own praatplaten" ON public.praatplaten AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can update own praatplaten" ON public.praatplaten AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Anyone can submit compositions" ON public.submissions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Teachers can delete submissions of own classes" ON public.submissions AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = submissions.class_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Teachers can read submissions of own classes" ON public.submissions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = submissions.class_id) AND (classes.teacher_id = auth.uid())))));
CREATE POLICY "Allow insert for authenticated users" ON public.teachers AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY "Teachers can read own profile" ON public.teachers AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Teachers can update own profile" ON public.teachers AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "Anyone can read active templates by code" ON public.templates AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND (code IS NOT NULL)));
CREATE POLICY "Teachers can create templates" ON public.templates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can delete own templates" ON public.templates AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can read own templates" ON public.templates AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = teacher_id));
CREATE POLICY "Teachers can read system templates" ON public.templates AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id IS NULL));
CREATE POLICY "Teachers can update own templates" ON public.templates AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = teacher_id));
CREATE POLICY usage_stats_read_authenticated ON public.usage_stats AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ====
-- FUNCTIONS

-- ====
CREATE OR REPLACE FUNCTION public.activate_assignment(p_class_id uuid, p_template_id uuid DEFAULT NULL::uuid, p_praatplaat_id uuid DEFAULT NULL::uuid, p_storyboard_ref text DEFAULT NULL::text, p_card_id uuid DEFAULT NULL::uuid, p_free_theme_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
           + (CASE WHEN p_storyboard_ref IS NOT NULL THEN 1 ELSE 0 END)
           + (CASE WHEN p_free_theme_id IS NOT NULL THEN 1 ELSE 0 END);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Precies één opdracht-type vereist';
  END IF;

  -- Bepaal type + valideer ownership van DB-resources
  IF p_template_id IS NOT NULL THEN
    v_type := 'template';
    -- Eigen template OF een systeem-template (teacher_id NULL, gedeeld)
    IF NOT EXISTS (
      SELECT 1 FROM public.templates
      WHERE id = p_template_id AND (teacher_id = auth.uid() OR teacher_id IS NULL)
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
  ELSIF p_storyboard_ref IS NOT NULL THEN
    v_type := 'storyboard';
    IF length(trim(p_storyboard_ref)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige storyboard-referentie';
    END IF;
  ELSE
    v_type := 'free';
    IF length(trim(p_free_theme_id)) = 0 THEN
      RAISE EXCEPTION 'Ongeldige thema-referentie';
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

  -- Hervatten: bestaande rij voor (klas + bron) zoeken
  SELECT id INTO v_assignment_id
  FROM public.class_assignments
  WHERE class_id = p_class_id
    AND (
      (v_type = 'template'   AND template_id   = p_template_id) OR
      (v_type = 'praatplaat' AND praatplaat_id = p_praatplaat_id) OR
      (v_type = 'storyboard' AND storyboard_ref = p_storyboard_ref) OR
      (v_type = 'free'       AND free_theme_id  = p_free_theme_id)
    )
  LIMIT 1;

  IF v_assignment_id IS NOT NULL THEN
    UPDATE public.class_assignments
    SET is_active = TRUE, activated_at = NOW(), card_id = p_card_id
    WHERE id = v_assignment_id;
  ELSE
    INSERT INTO public.class_assignments (
      class_id, teacher_id, assignment_type, template_id, praatplaat_id, storyboard_ref, free_theme_id, card_id, is_active
    )
    VALUES (
      p_class_id, auth.uid(), v_type, p_template_id, p_praatplaat_id, p_storyboard_ref, p_free_theme_id, p_card_id, TRUE
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  RETURN v_assignment_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.activate_lesson_card(p_lesson_card_id uuid, p_class_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_teacher UUID := auth.uid();
  v_lc public.lesson_cards%ROWTYPE;
  v_card_id UUID;
  v_card_title TEXT;
  v_card_bullets JSONB;
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
    -- Inline kaart → find-or-create een docent-eigen assignment_cards-rij.
    -- Match op titel ÉN bullets: ingebouwde kaarten delen dezelfde titel,
    -- dus titel alleen koppelt de verkeerde inhoud (QA-7).
    -- Nieuwe rijen zijn AFGELEID (is_derived) → verborgen uit de bibliotheek.
    v_card_title := left(COALESCE(v_lc.card_inline->>'title', v_lc.title), 120);
    v_card_bullets := COALESCE(v_lc.card_inline->'bullets', '[]'::jsonb);

    SELECT id INTO v_card_id
    FROM public.assignment_cards
    WHERE teacher_id = v_teacher
      AND title = v_card_title
      AND bullets = v_card_bullets
    LIMIT 1;

    IF v_card_id IS NULL THEN
      INSERT INTO public.assignment_cards (teacher_id, title, bullets, is_derived)
      VALUES (v_teacher, v_card_title, v_card_bullets, TRUE)
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
$function$
;

CREATE OR REPLACE FUNCTION public.activate_praatplaat(p_praatplaat_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Valideer ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  -- Activeer (trigger deactiveert automatisch alle andere)
  UPDATE public.praatplaten
  SET is_active = TRUE
  WHERE id = p_praatplaat_id;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.activate_praatplaat_from_catalog(p_class_id uuid, p_name text, p_theme_id text, p_location_id text, p_image_url text, p_card_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.check_max_classes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.classes
  WHERE teacher_id = NEW.teacher_id;

  SELECT COALESCE(max_classes, 8) INTO max_allowed
  FROM public.teachers
  WHERE id = NEW.teacher_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Maximum number of classes (%) reached', max_allowed;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_action text, p_identifier text, p_max_requests integer, p_window_seconds integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limits
  WHERE action = p_action
    AND identifier = p_identifier
    AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  IF v_count >= p_max_requests THEN
    RAISE EXCEPTION 'Rate limit exceeded for %', p_action;
  END IF;

  INSERT INTO public.rate_limits (action, identifier)
  VALUES (p_action, p_identifier);

  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour'
    AND action = p_action;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_saved_composition(p_save_code character varying, p_student_name text)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_normalized_code VARCHAR; v_new_secret VARCHAR(32); v_rows_affected INT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));
  PERFORM check_rate_limit('claim_save', 'code:' || v_normalized_code, 5, 60);
  v_new_secret := generate_save_secret();
  UPDATE public.submissions SET save_secret = v_new_secret,
    student_name = COALESCE(NULLIF(TRIM(p_student_name), ''), student_name),
    last_updated_at = NOW()
  WHERE save_code = v_normalized_code
    AND (last_updated_at IS NULL OR last_updated_at > NOW() - INTERVAL '60 days');
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN RAISE EXCEPTION 'Bewaarcode niet gevonden of verlopen'; END IF;
  RETURN v_new_secret;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_submissions INT := 0;
  deleted_bewaarcodes INT := 0;
  cleared_praatplaat_shares INT := 0;
  cleared_album_shares INT := 0;
BEGIN
  -- 1a. Docent-inzendingen (klas of praatplaat) — 1 schooljaar na laatste activiteit.
  WITH del AS (
    DELETE FROM public.submissions
    WHERE (class_id IS NOT NULL OR praatplaat_id IS NOT NULL)
      AND COALESCE(last_updated_at, submitted_at, created_at) < NOW() - INTERVAL '365 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_submissions FROM del;

  -- 1b. Losse composities zonder klas/praatplaat (online bewaarcode of gedeelde
  --     link) — 60 dagen na laatste activiteit. Dekt zowel bewaarcodes (60 d)
  --     als deellinks (30 d), beide ruim binnen 60 dagen.
  WITH del AS (
    DELETE FROM public.submissions
    WHERE class_id IS NULL AND praatplaat_id IS NULL
      AND COALESCE(last_updated_at, created_at) < NOW() - INTERVAL '60 days'
    RETURNING 1
  )
  SELECT count(*) INTO deleted_bewaarcodes FROM del;

  -- 1c. Vervallen deelcodes van praatplaten wissen (toegang stopt; rij blijft).
  UPDATE public.praatplaten
    SET share_code = NULL, share_expires_at = NULL
    WHERE share_code IS NOT NULL
      AND share_expires_at IS NOT NULL
      AND share_expires_at < NOW();
  GET DIAGNOSTICS cleared_praatplaat_shares = ROW_COUNT;

  -- 1d. Vervallen klasalbum-codes wissen.
  UPDATE public.class_assignments
    SET share_code = NULL, share_expires_at = NULL
    WHERE share_code IS NOT NULL
      AND share_expires_at IS NOT NULL
      AND share_expires_at < NOW();
  GET DIAGNOSTICS cleared_album_shares = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_submissions', deleted_submissions,
    'deleted_bewaarcodes', deleted_bewaarcodes,
    'cleared_praatplaat_shares', cleared_praatplaat_shares,
    'cleared_album_shares', cleared_album_shares,
    'ran_at', NOW()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_praatplaat(p_name text, p_theme_id text, p_location_id text, p_image_url text, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_teacher_id UUID;
  v_praatplaat_id UUID;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('create_praatplaat', auth.uid()::text, 10, 60);

  -- Als class_id opgegeven: valideer dat klas bij docent hoort
  IF p_class_id IS NOT NULL THEN
    SELECT teacher_id INTO v_teacher_id
    FROM public.classes
    WHERE id = p_class_id;

    IF v_teacher_id IS NULL OR v_teacher_id != auth.uid() THEN
      RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
    END IF;
  END IF;

  -- Maak praatplaat aan
  INSERT INTO public.praatplaten (class_id, teacher_id, name, theme_id, location_id, image_url)
  VALUES (p_class_id, auth.uid(), p_name, p_theme_id, p_location_id, p_image_url)
  RETURNING id INTO v_praatplaat_id;

  RETURN v_praatplaat_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deactivate_class_assignment(p_class_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Klas niet gevonden of geen toegang';
  END IF;

  UPDATE public.class_assignments
  SET is_active = FALSE
  WHERE class_id = p_class_id AND is_active = TRUE;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deactivate_praatplaat(p_praatplaat_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Valideer ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  UPDATE public.praatplaten
  SET is_active = FALSE
  WHERE id = p_praatplaat_id;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_praatplaat(p_praatplaat_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Valideer ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  -- Verwijder praatplaat (submissions.praatplaat_id wordt NULL via ON DELETE SET NULL)
  DELETE FROM public.praatplaten
  WHERE id = p_praatplaat_id;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_single_active_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.class_assignments
    SET is_active = FALSE
    WHERE class_id = NEW.class_id
      AND id != NEW.id
      AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_class_code()
 RETURNS character
 LANGUAGE plpgsql
AS $function$
DECLARE new_code CHAR(4); code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE code = new_code) INTO code_exists;
    IF NOT code_exists THEN RETURN new_code; END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_praatplaat_share_code()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN generate_share_code_v2();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_save_code()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(6) := '';
  code_exists BOOLEAN;
  i INT;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(
      SELECT 1 FROM public.submissions WHERE save_code = new_code
      UNION ALL
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN RETURN new_code; END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_save_secret()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  secret VARCHAR(32) := '';
  i INT;
BEGIN
  FOR i IN 1..32 LOOP
    secret := secret || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN secret;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_share_code()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_share_code_v2()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.generate_template_code()
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
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
      SELECT 1 FROM public.templates WHERE code = new_code
      UNION ALL
      SELECT 1 FROM public.submissions WHERE share_code = new_code
    ) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_assignment(p_class_code text)
 RETURNS TABLE(assignment_type text, payload jsonb, card jsonb, class_id uuid, class_name text, peer_review jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM check_rate_limit('get_assignment', 'code:' || p_class_code, 30, 60);

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
      || jsonb_build_object('duration_label', ca.duration_label)
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_praatplaat(p_class_code text)
 RETURNS TABLE(praatplaat_id uuid, praatplaat_name text, image_url text, theme_id text, location_id text, class_id uuid, class_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('get_praatplaat', 'code:' || p_class_code, 30, 60);

  RETURN QUERY
  SELECT
    p.id AS praatplaat_id,
    p.name AS praatplaat_name,
    p.image_url,
    p.theme_id,
    p.location_id,
    c.id AS class_id,
    c.name AS class_name
  FROM public.class_assignments ca
  JOIN public.classes c ON c.id = ca.class_id
  JOIN public.praatplaten p ON p.id = ca.praatplaat_id
  WHERE c.code = p_class_code
    AND ca.is_active = TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_builtin_lesson_cards()
 RETURNS TABLE(id uuid, builtin_key text, assignment_type text, title text, level text, lesson_goal text, phases jsonb, cover_image text, pdf_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    lc.id,
    lc.builtin_key,
    lc.assignment_type,
    lc.title,
    lc.level,
    lc.lesson_goal,
    lc.phases,
    lc.cover_image,
    lc.pdf_url
  FROM public.lesson_cards lc
  WHERE lc.teacher_id IS NULL
    AND lc.is_active IS TRUE
  ORDER BY lc.created_at ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_class_by_code(p_code character)
 RETURNS TABLE(id uuid, name text, teacher_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY SELECT c.id, c.name, t.display_name as teacher_name FROM public.classes c JOIN public.teachers t ON t.id = c.teacher_id WHERE c.code = p_code AND c.is_active = TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_peer_compliments(p_save_code character varying)
 RETURNS TABLE(chip text, avg_stars numeric, rater_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_normalized_code VARCHAR;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));
  PERFORM check_rate_limit('peer_compliments', 'code:' || v_normalized_code, 30, 60);

  RETURN QUERY
  WITH target AS (
    SELECT s.id FROM public.submissions s WHERE s.save_code = v_normalized_code
  ),
  starred AS (
    -- Nieuwe rijen: sterren per criterium
    SELECT r.key AS chip, (r.value)::TEXT::NUMERIC AS stars
    FROM public.peer_feedback pf
    JOIN target t ON t.id = pf.submission_id,
    LATERAL jsonb_each(pf.ratings) r
    WHERE pf.ratings IS NOT NULL
    UNION ALL
    -- Oude rijen (alleen chips): tellen mee zonder sterren
    SELECT unnest(pf.chips) AS chip, NULL::NUMERIC AS stars
    FROM public.peer_feedback pf
    JOIN target t ON t.id = pf.submission_id
    WHERE pf.ratings IS NULL
  )
  SELECT st.chip, ROUND(AVG(st.stars), 1) AS avg_stars, COUNT(*)::BIGINT AS rater_count
  FROM starred st
  GROUP BY st.chip
  ORDER BY AVG(st.stars) DESC NULLS LAST, COUNT(*) DESC, st.chip;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_peer_review_batch(p_class_code text, p_own_submission_id uuid, p_batch_size integer DEFAULT 3)
 RETURNS TABLE(submission_id uuid, composition_name text, composition_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_id UUID;
  v_reviewed INT;
  v_remaining INT;
BEGIN
  PERFORM check_rate_limit('peer_batch', 'sub:' || p_own_submission_id::TEXT, 10, 60);

  SELECT s.class_id INTO v_class_id
  FROM public.submissions s
  JOIN public.classes c ON c.id = s.class_id
  WHERE s.id = p_own_submission_id AND c.code = TRIM(p_class_code);

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Inzending niet gevonden bij deze klas';
  END IF;

  -- Venster: toggle uit of timer verlopen → lege set (client toont nette melding)
  IF NOT peer_review_is_open(v_class_id) THEN
    RETURN;
  END IF;

  -- Quotum: maximaal 3 beoordeelde klasgenoten per leerling
  SELECT COUNT(DISTINCT pf.submission_id) INTO v_reviewed
  FROM public.peer_feedback pf
  WHERE pf.from_submission_id = p_own_submission_id;

  v_remaining := 3 - v_reviewed;
  IF v_remaining <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.id, s.composition_name, s.composition_data
  FROM public.submissions s
  WHERE s.class_id = v_class_id
    AND s.id <> p_own_submission_id
    AND s.submitted_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.peer_feedback pf
      WHERE pf.submission_id = s.id AND pf.from_submission_id = p_own_submission_id
    )
  ORDER BY random()
  LIMIT LEAST(GREATEST(p_batch_size, 1), v_remaining);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_peer_stars_for_class(p_class_id uuid)
 RETURNS TABLE(submission_id uuid, total_stars bigint, rater_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Alleen de eigenaar-docent van deze klas
  IF NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Geen toegang tot deze klas';
  END IF;

  RETURN QUERY
  SELECT
    pf.submission_id,
    -- Sterren over alle criteria en beoordelaars opgeteld; chips-only-rijen
    -- (pre-028, ratings IS NULL) tellen als beoordelaar met 0 sterren
    COALESCE(SUM(
      (SELECT SUM((r.value)::TEXT::NUMERIC)
       FROM jsonb_each(pf.ratings) r)
    ), 0)::BIGINT AS total_stars,
    COUNT(*)::BIGINT AS rater_count
  FROM public.peer_feedback pf
  JOIN public.submissions s ON s.id = pf.submission_id
  WHERE s.class_id = p_class_id
  GROUP BY pf.submission_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid)
 RETURNS TABLE(id uuid, student_name text, composition_name text, composition_data jsonb, position_x real, position_y real, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Valideer: docent is eigenaar van de praatplaat
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE praatplaten.id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.student_name,
    s.composition_name,
    s.composition_data,
    s.position_x,
    s.position_y,
    s.created_at
  FROM public.submissions s
  WHERE s.praatplaat_id = p_praatplaat_id
  ORDER BY s.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, student_name text, composition_name text, composition_data jsonb, position_x real, position_y real, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Valideer: docent is eigenaar van de praatplaat
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE praatplaten.id = p_praatplaat_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.student_name,
    s.composition_name,
    s.composition_data,
    s.position_x,
    s.position_y,
    s.created_at
  FROM public.submissions s
  WHERE s.praatplaat_id = p_praatplaat_id
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
  ORDER BY s.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_shared_class_album(p_code character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_shared_composition(p_code character varying)
 RETURNS TABLE(id uuid, student_name text, composition_name text, composition_data jsonb, created_at timestamp with time zone, expires_at timestamp with time zone, view_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_normalized_code VARCHAR;
BEGIN
  v_normalized_code := UPPER(TRIM(p_code));
  PERFORM check_rate_limit('get_shared', 'code:' || v_normalized_code, 30, 60);

  UPDATE public.submissions
  SET view_count = submissions.view_count + 1
  WHERE share_code = v_normalized_code
    AND (submissions.expires_at IS NULL OR submissions.expires_at > NOW());

  RETURN QUERY
  SELECT
    s.id, s.student_name, s.composition_name,
    s.composition_data, s.created_at, s.expires_at, s.view_count
  FROM public.submissions s
  WHERE s.share_code = v_normalized_code
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_shared_praatplaat(p_code character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_praatplaat RECORD;
  v_result JSONB;
  v_submissions JSONB;
BEGIN
  -- Rate limit: 30 per minuut per code
  PERFORM check_rate_limit('get_shared_praatplaat', 'pp:' || p_code, 30, 60);

  -- Haal praatplaat op
  SELECT id, name, image_url, theme_id, location_id, share_expires_at
  INTO v_praatplaat
  FROM public.praatplaten
  WHERE share_code = p_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden';
  END IF;

  -- Check verloopdatum
  IF v_praatplaat.share_expires_at IS NOT NULL AND v_praatplaat.share_expires_at < NOW() THEN
    RAISE EXCEPTION 'Link is verlopen';
  END IF;

  -- Verhoog view count
  UPDATE public.praatplaten
  SET share_view_count = share_view_count + 1
  WHERE share_code = p_code;

  -- Haal submissions op
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'student_name', s.student_name,
      'composition_name', s.composition_name,
      'composition_data', s.composition_data,
      'position_x', s.position_x,
      'position_y', s.position_y,
      'created_at', s.created_at
    ) ORDER BY s.created_at DESC
  ), '[]'::jsonb)
  INTO v_submissions
  FROM public.submissions s
  WHERE s.praatplaat_id = v_praatplaat.id;

  -- Bouw response
  v_result := jsonb_build_object(
    'praatplaat', jsonb_build_object(
      'id', v_praatplaat.id,
      'name', v_praatplaat.name,
      'image_url', v_praatplaat.image_url,
      'theme_id', v_praatplaat.theme_id,
      'location_id', v_praatplaat.location_id
    ),
    'submissions', v_submissions
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_template_by_code(p_code character varying)
 RETURNS TABLE(id uuid, name text, description text, teacher_name text, composition_data jsonb, instructions text, clips_locked boolean, lock_options jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.name, t.description,
    te.display_name as teacher_name,
    t.composition_data, t.instructions,
    t.clips_locked, t.lock_options, t.created_at
  FROM public.templates t
  JOIN public.teachers te ON te.id = t.teacher_id
  WHERE t.code = UPPER(TRIM(p_code))
    AND t.is_active = TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.teachers (id, email, display_name) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.load_saved_composition(p_save_code character varying)
 RETURNS TABLE(id uuid, student_name text, composition_name text, composition_data jsonb, last_updated_at timestamp with time zone, student_email text, feedback_sticker text, feedback_level smallint, feedback_text text, feedback_at timestamp with time zone, class_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_normalized_code VARCHAR;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));

  -- Rate limit: max 30 lookups per minuut per code
  PERFORM check_rate_limit('load_save', 'code:' || v_normalized_code, 30, 60);

  RETURN QUERY
  SELECT
    s.id, s.student_name, s.composition_name,
    s.composition_data, s.last_updated_at, s.student_email,
    s.feedback_sticker, s.feedback_level, s.feedback_text, s.feedback_at,
    c.code::TEXT AS class_code
  FROM public.submissions s
  LEFT JOIN public.classes c ON c.id = s.class_id
  WHERE s.save_code = v_normalized_code
    AND (s.last_updated_at IS NULL OR s.last_updated_at > NOW() - INTERVAL '60 days');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_usage_event(p_event text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_event NOT IN (
    'app_start',
    'composition_started',
    'composition_saved',
    'composition_submitted',
    'stage_reached',
    'mp3_export',
    'video_export',
    'share_link_created',
    'save_code_created',
    'class_code_entered',
    'teacher_dashboard_opened'
  ) THEN
    RETURN; -- onbekend event stilzwijgend negeren
  END IF;

  -- Max 600/min per event — schoolklassen passen ruim, scripts niet.
  PERFORM check_rate_limit('usage_' || p_event, 'global', 600, 60);

  INSERT INTO public.usage_stats (event, day, count)
  VALUES (p_event, CURRENT_DATE, 1)
  ON CONFLICT (event, day)
  DO UPDATE SET count = public.usage_stats.count + 1;
EXCEPTION WHEN OTHERS THEN
  -- Statistiek mag nooit een gebruikersflow breken
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_submission_seen(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  PERFORM check_rate_limit('mark_seen', 'teacher:' || auth.uid()::TEXT, 120, 60);

  UPDATE public.submissions s
  SET teacher_seen_at = COALESCE(s.teacher_seen_at, NOW())
  FROM public.classes c
  WHERE s.id = p_submission_id
    AND s.class_id = c.id
    AND c.teacher_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.peer_review_is_open(p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.class_assignments ca
    WHERE ca.class_id = p_class_id
      AND ca.is_active = TRUE
      AND ca.peer_review_enabled = TRUE
      AND (ca.peer_review_closes_at IS NULL OR ca.peer_review_closes_at > NOW())
  );
$function$
;

CREATE OR REPLACE FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS TABLE(save_code character varying, save_secret character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_code VARCHAR(6); v_secret VARCHAR(32); v_class_id UUID := NULL; v_identifier TEXT;
BEGIN
  v_identifier := COALESCE(auth.uid()::TEXT, 'anon:' || md5(p_student_name));
  PERFORM check_rate_limit('save_online', v_identifier, 10, 60);
  IF p_class_code IS NOT NULL AND char_length(TRIM(p_class_code)) = 4 THEN
    SELECT id INTO v_class_id FROM public.classes WHERE code = TRIM(p_class_code) AND is_active = TRUE;
  END IF;
  v_code := generate_save_code();
  v_secret := generate_save_secret();
  INSERT INTO public.submissions (class_id, student_name, composition_name, composition_data, save_code, save_secret, last_updated_at, student_email)
  VALUES (v_class_id, p_student_name, p_composition_name, p_composition_data, v_code, v_secret, NOW(), NULLIF(TRIM(p_email), ''));
  RETURN QUERY SELECT v_code, v_secret;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_assignment_peer_review(p_assignment_id uuid, p_enabled boolean, p_feedback_card_id uuid DEFAULT NULL::uuid, p_close_after_minutes integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_card_id UUID;
  v_closes_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Kaart-fallback: aanzetten zonder kaart → ingebouwde standaardkaart
  v_card_id := p_feedback_card_id;
  IF p_enabled AND v_card_id IS NULL THEN
    SELECT id INTO v_card_id FROM public.feedback_cards WHERE builtin_key = 'standaard';
  END IF;

  IF v_card_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.feedback_cards fc
    WHERE fc.id = v_card_id AND (fc.teacher_id = auth.uid() OR fc.teacher_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Feedbackkaart niet gevonden of geen toegang';
  END IF;

  -- Timer: alleen relevant bij aanzetten; NULL = geen automatische sluiting
  IF p_enabled AND p_close_after_minutes IS NOT NULL AND p_close_after_minutes > 0 THEN
    v_closes_at := NOW() + make_interval(mins => p_close_after_minutes);
  ELSE
    v_closes_at := NULL;
  END IF;

  UPDATE public.class_assignments ca
  SET peer_review_enabled = p_enabled,
      feedback_card_id = v_card_id,
      peer_review_closes_at = v_closes_at
  WHERE ca.id = p_assignment_id
    AND ca.teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opdracht niet gevonden of geen toegang';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_submission_feedback(p_submission_id uuid, p_sticker text DEFAULT NULL::text, p_level smallint DEFAULT NULL::smallint, p_text text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Max 60 feedback-acties per minuut per docent
  PERFORM check_rate_limit('set_feedback', 'teacher:' || auth.uid()::TEXT, 60, 60);

  UPDATE public.submissions s
  SET
    feedback_sticker = p_sticker,
    feedback_level   = p_level,
    feedback_text    = NULLIF(TRIM(COALESCE(p_text, '')), ''),
    feedback_at      = CASE
                         WHEN p_sticker IS NULL AND p_level IS NULL
                              AND NULLIF(TRIM(COALESCE(p_text, '')), '') IS NULL
                         THEN NULL  -- alles gewist → feedback verwijderd
                         ELSE NOW()
                       END
  FROM public.classes c
  WHERE s.id = p_submission_id
    AND s.class_id = c.id
    AND c.teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inzending niet gevonden of geen toegang';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.share_class_album(p_assignment_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.share_composition(p_student_name text, p_composition_name text, p_composition_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
  v_identifier TEXT;
BEGIN
  v_identifier := COALESCE(auth.uid()::TEXT, 'anon:' || md5(p_student_name));
  PERFORM check_rate_limit('share', v_identifier, 10, 60);

  v_code := generate_share_code();
  v_expires := NOW() + INTERVAL '30 days';

  INSERT INTO public.submissions (
    class_id, student_name, composition_name,
    composition_data, share_code, expires_at, view_count
  )
  VALUES (
    NULL, p_student_name, p_composition_name,
    p_composition_data, v_code, v_expires, 0
  );

  RETURN v_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.share_praatplaat(p_praatplaat_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_code VARCHAR(8);
  v_expires TIMESTAMPTZ;
BEGIN
  -- Rate limit: 10 per minuut per docent
  PERFORM check_rate_limit('share_praatplaat', auth.uid()::text, 10, 60);

  -- Valideer: docent is eigenaar
  SELECT share_code INTO v_code
  FROM public.praatplaten
  WHERE id = p_praatplaat_id AND teacher_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden of geen toegang';
  END IF;

  v_expires := NOW() + INTERVAL '30 days';

  IF v_code IS NOT NULL THEN
    -- Bestaande code: verleng verloopdatum
    UPDATE public.praatplaten
    SET share_expires_at = v_expires
    WHERE id = p_praatplaat_id;

    RETURN v_code;
  ELSE
    -- Genereer nieuwe code
    v_code := generate_praatplaat_share_code();

    UPDATE public.praatplaten
    SET share_code = v_code,
        share_expires_at = v_expires,
        share_view_count = 0
    WHERE id = p_praatplaat_id;

    RETURN v_code;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_composition(p_class_code character, p_student_name text, p_composition_name text, p_composition_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
  v_identifier TEXT;
BEGIN
  v_identifier := 'class:' || p_class_code;
  PERFORM check_rate_limit('submit', v_identifier, 60, 60);

  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas-code niet gevonden';
  END IF;

  INSERT INTO public.submissions (class_id, student_name, composition_name, composition_data)
  VALUES (v_class_id, p_student_name, p_composition_name, p_composition_data)
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_or_update_composition(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid DEFAULT NULL::uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_assignment_type text DEFAULT NULL::text, p_assignment_ref text DEFAULT NULL::text, p_praatplaat_position_x real DEFAULT NULL::real, p_praatplaat_position_y real DEFAULT NULL::real)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
  v_identifier TEXT;
BEGIN
  -- Rate limit: max 60 per minuut per klascode
  v_identifier := 'classcode:' || TRIM(p_class_code);
  PERFORM check_rate_limit('submit_or_update', v_identifier, 60, 60);

  -- Valideer assignment_type indien opgegeven
  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat', 'storyboard', 'free') THEN
    RAISE EXCEPTION 'Invalid assignment_type: %', p_assignment_type;
  END IF;

  -- Zoek klas op code
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = TRIM(p_class_code) AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden of niet actief';
  END IF;

  -- Bepaal submission-ID (idempotente UPSERT via client_id)
  v_submission_id := COALESCE(p_client_id, gen_random_uuid());

  INSERT INTO public.submissions (
    id,
    class_id,
    student_name,
    composition_name,
    composition_data,
    assignment_id,
    assignment_type,
    assignment_ref,
    praatplaat_id,
    position_x,
    position_y,
    last_updated_at
  )
  VALUES (
    v_submission_id,
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
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    composition_name = EXCLUDED.composition_name,
    composition_data = EXCLUDED.composition_data,
    student_name = EXCLUDED.student_name,
    position_x = COALESCE(EXCLUDED.position_x, public.submissions.position_x),
    position_y = COALESCE(EXCLUDED.position_y, public.submissions.position_y),
    last_updated_at = NOW();

  RETURN v_submission_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid DEFAULT NULL::uuid, p_assignment_id uuid DEFAULT NULL::uuid, p_assignment_type text DEFAULT NULL::text, p_assignment_ref text DEFAULT NULL::text, p_praatplaat_position_x real DEFAULT NULL::real, p_praatplaat_position_y real DEFAULT NULL::real)
 RETURNS TABLE(submission_id uuid, save_code character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
  v_identifier TEXT;
  v_save_code VARCHAR(6);
BEGIN
  -- Rate limit: gedeeld met v1 (zelfde actie-key)
  v_identifier := 'classcode:' || TRIM(p_class_code);
  PERFORM check_rate_limit('submit_or_update', v_identifier, 60, 60);

  IF p_assignment_type IS NOT NULL AND p_assignment_type NOT IN ('template', 'praatplaat', 'storyboard', 'free') THEN
    RAISE EXCEPTION 'Invalid assignment_type: %', p_assignment_type;
  END IF;

  SELECT c.id INTO v_class_id
  FROM public.classes c
  WHERE c.code = TRIM(p_class_code) AND c.is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden of niet actief';
  END IF;

  v_submission_id := COALESCE(p_client_id, gen_random_uuid());

  INSERT INTO public.submissions (
    id, class_id, student_name, composition_name, composition_data,
    assignment_id, assignment_type, assignment_ref,
    praatplaat_id, position_x, position_y,
    save_code, save_secret, submitted_at, last_updated_at
  )
  VALUES (
    v_submission_id,
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
    generate_save_code(),
    generate_save_secret(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    composition_name = EXCLUDED.composition_name,
    composition_data = EXCLUDED.composition_data,
    student_name = EXCLUDED.student_name,
    position_x = COALESCE(EXCLUDED.position_x, public.submissions.position_x),
    position_y = COALESCE(EXCLUDED.position_y, public.submissions.position_y),
    -- Bestaande code behouden; alleen minten als de rij er nog geen had
    -- (bijv. eerder ingeleverd via de oude v1-RPC)
    save_code   = COALESCE(public.submissions.save_code, EXCLUDED.save_code),
    save_secret = COALESCE(public.submissions.save_secret, EXCLUDED.save_secret),
    -- Eerste formele inlevering telt; blijft daarna staan
    submitted_at = COALESCE(public.submissions.submitted_at, NOW()),
    last_updated_at = NOW();

  SELECT s.save_code INTO v_save_code
  FROM public.submissions s
  WHERE s.id = v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_save_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_peer_feedback(p_from_submission_id uuid, p_target_submission_id uuid, p_chips text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from_class UUID;
  v_target_class UUID;
BEGIN
  PERFORM check_rate_limit('peer_submit', 'sub:' || p_from_submission_id::TEXT, 20, 60);

  IF p_chips IS NULL OR cardinality(p_chips) < 1 OR cardinality(p_chips) > 3 THEN
    RAISE EXCEPTION 'Kies 1 tot 3 complimenten';
  END IF;

  SELECT class_id INTO v_from_class FROM public.submissions WHERE id = p_from_submission_id;
  SELECT class_id INTO v_target_class FROM public.submissions WHERE id = p_target_submission_id;

  IF v_from_class IS NULL OR v_target_class IS NULL OR v_from_class <> v_target_class THEN
    RAISE EXCEPTION 'Inzendingen horen niet bij dezelfde klas';
  END IF;

  INSERT INTO public.peer_feedback (submission_id, from_submission_id, chips)
  VALUES (p_target_submission_id, p_from_submission_id, p_chips)
  ON CONFLICT (submission_id, from_submission_id)
  DO UPDATE SET chips = EXCLUDED.chips, created_at = NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_peer_feedback_v2(p_from_submission_id uuid, p_target_submission_id uuid, p_ratings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from_class UUID;
  v_target_class UUID;
  v_key TEXT;
  v_value JSONB;
  v_count INT := 0;
  v_reviewed INT;
  v_chips TEXT[];
BEGIN
  PERFORM check_rate_limit('peer_submit', 'sub:' || p_from_submission_id::TEXT, 20, 60);

  -- Ratings valideren: object met 1-8 criteria, waarden 1-3 (hele sterren)
  IF p_ratings IS NULL OR jsonb_typeof(p_ratings) <> 'object' THEN
    RAISE EXCEPTION 'Ongeldige beoordeling';
  END IF;
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_ratings) LOOP
    v_count := v_count + 1;
    IF jsonb_typeof(v_value) <> 'number'
       OR (v_value)::TEXT::NUMERIC NOT IN (1, 2, 3)
       OR char_length(v_key) > 80 THEN
      RAISE EXCEPTION 'Ongeldige beoordeling';
    END IF;
  END LOOP;
  IF v_count < 1 OR v_count > 8 THEN
    RAISE EXCEPTION 'Beoordeel 1 tot 8 criteria';
  END IF;

  SELECT class_id INTO v_from_class FROM public.submissions WHERE id = p_from_submission_id;
  SELECT class_id INTO v_target_class FROM public.submissions WHERE id = p_target_submission_id;

  IF v_from_class IS NULL OR v_target_class IS NULL OR v_from_class <> v_target_class THEN
    RAISE EXCEPTION 'Inzendingen horen niet bij dezelfde klas';
  END IF;

  -- Venster: toggle uit of timer verlopen → weigeren
  IF NOT peer_review_is_open(v_from_class) THEN
    RAISE EXCEPTION 'Feedbackronde is gesloten';
  END IF;

  -- Quotum: max 3 ándere inzendingen (update van een bestaand paar mag altijd)
  SELECT COUNT(DISTINCT pf.submission_id) INTO v_reviewed
  FROM public.peer_feedback pf
  WHERE pf.from_submission_id = p_from_submission_id
    AND pf.submission_id <> p_target_submission_id;

  IF v_reviewed >= 3 THEN
    RAISE EXCEPTION 'Maximum van 3 beoordelingen bereikt';
  END IF;

  -- chips = criteria-namen (compatibiliteit met v1-lezers)
  SELECT array_agg(key) INTO v_chips FROM jsonb_each(p_ratings);

  INSERT INTO public.peer_feedback (submission_id, from_submission_id, chips, ratings)
  VALUES (p_target_submission_id, p_from_submission_id, v_chips, p_ratings)
  ON CONFLICT (submission_id, from_submission_id)
  DO UPDATE SET chips = EXCLUDED.chips, ratings = EXCLUDED.ratings, created_at = NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_praatplaat_composition(p_class_code text, p_praatplaat_id uuid, p_position_x real, p_position_y real, p_student_name text, p_composition_name text, p_composition_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit('submit', 'class:' || p_class_code, 60, 60);

  -- Zoek klas
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas niet gevonden';
  END IF;

  -- Valideer praatplaat behoort tot klas
  IF NOT EXISTS (
    SELECT 1 FROM public.praatplaten
    WHERE id = p_praatplaat_id AND class_id = v_class_id
  ) THEN
    RAISE EXCEPTION 'Praatplaat niet gevonden voor deze klas';
  END IF;

  -- Valideer positie
  IF p_position_x < 0 OR p_position_x > 1 OR p_position_y < 0 OR p_position_y > 1 THEN
    RAISE EXCEPTION 'Ongeldige positie';
  END IF;

  -- Insert submission met praatplaat-koppeling
  INSERT INTO public.submissions (
    class_id,
    student_name,
    composition_name,
    composition_data,
    praatplaat_id,
    position_x,
    position_y
  ) VALUES (
    v_class_id,
    p_student_name,
    p_composition_name,
    p_composition_data,
    p_praatplaat_id,
    p_position_x,
    p_position_y
  )
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_lesson_cards_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_saved_composition(p_save_code character varying, p_save_secret character varying, p_composition_data jsonb, p_composition_name text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_normalized_code VARCHAR; v_rows_affected INT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_save_code));
  PERFORM check_rate_limit('update_save', 'code:' || v_normalized_code, 30, 60);
  UPDATE public.submissions SET composition_data = p_composition_data,
    composition_name = COALESCE(NULLIF(TRIM(p_composition_name), ''), composition_name),
    last_updated_at = NOW()
  WHERE save_code = v_normalized_code AND save_secret = p_save_secret;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN RAISE EXCEPTION 'Ongeldige bewaarcode of geheim'; END IF;
  RETURN TRUE;
END;
$function$
;

-- ====
-- FUNCTION ACL

-- ====
REVOKE ALL ON FUNCTION public.activate_assignment(p_class_id uuid, p_template_id uuid, p_praatplaat_id uuid, p_storyboard_ref text, p_card_id uuid, p_free_theme_id text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.activate_assignment(p_class_id uuid, p_template_id uuid, p_praatplaat_id uuid, p_storyboard_ref text, p_card_id uuid, p_free_theme_id text) TO authenticated; GRANT EXECUTE ON FUNCTION public.activate_assignment(p_class_id uuid, p_template_id uuid, p_praatplaat_id uuid, p_storyboard_ref text, p_card_id uuid, p_free_theme_id text) TO anon; GRANT EXECUTE ON FUNCTION public.activate_assignment(p_class_id uuid, p_template_id uuid, p_praatplaat_id uuid, p_storyboard_ref text, p_card_id uuid, p_free_theme_id text) TO service_role; GRANT EXECUTE ON FUNCTION public.activate_assignment(p_class_id uuid, p_template_id uuid, p_praatplaat_id uuid, p_storyboard_ref text, p_card_id uuid, p_free_theme_id text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.activate_lesson_card(p_lesson_card_id uuid, p_class_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.activate_lesson_card(p_lesson_card_id uuid, p_class_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.activate_lesson_card(p_lesson_card_id uuid, p_class_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.activate_lesson_card(p_lesson_card_id uuid, p_class_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.activate_lesson_card(p_lesson_card_id uuid, p_class_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.activate_praatplaat(p_praatplaat_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.activate_praatplaat(p_praatplaat_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.activate_praatplaat(p_praatplaat_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.activate_praatplaat(p_praatplaat_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.activate_praatplaat(p_praatplaat_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.activate_praatplaat_from_catalog(p_class_id uuid, p_name text, p_theme_id text, p_location_id text, p_image_url text, p_card_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.activate_praatplaat_from_catalog(p_class_id uuid, p_name text, p_theme_id text, p_location_id text, p_image_url text, p_card_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.activate_praatplaat_from_catalog(p_class_id uuid, p_name text, p_theme_id text, p_location_id text, p_image_url text, p_card_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.activate_praatplaat_from_catalog(p_class_id uuid, p_name text, p_theme_id text, p_location_id text, p_image_url text, p_card_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.activate_praatplaat_from_catalog(p_class_id uuid, p_name text, p_theme_id text, p_location_id text, p_image_url text, p_card_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.check_max_classes() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.check_max_classes() TO authenticated; GRANT EXECUTE ON FUNCTION public.check_max_classes() TO anon; GRANT EXECUTE ON FUNCTION public.check_max_classes() TO service_role; GRANT EXECUTE ON FUNCTION public.check_max_classes() TO PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(p_action text, p_identifier text, p_max_requests integer, p_window_seconds integer) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.check_rate_limit(p_action text, p_identifier text, p_max_requests integer, p_window_seconds integer) TO authenticated; GRANT EXECUTE ON FUNCTION public.check_rate_limit(p_action text, p_identifier text, p_max_requests integer, p_window_seconds integer) TO anon; GRANT EXECUTE ON FUNCTION public.check_rate_limit(p_action text, p_identifier text, p_max_requests integer, p_window_seconds integer) TO service_role; GRANT EXECUTE ON FUNCTION public.check_rate_limit(p_action text, p_identifier text, p_max_requests integer, p_window_seconds integer) TO PUBLIC;
REVOKE ALL ON FUNCTION public.claim_saved_composition(p_save_code character varying, p_student_name text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.claim_saved_composition(p_save_code character varying, p_student_name text) TO authenticated; GRANT EXECUTE ON FUNCTION public.claim_saved_composition(p_save_code character varying, p_student_name text) TO anon; GRANT EXECUTE ON FUNCTION public.claim_saved_composition(p_save_code character varying, p_student_name text) TO service_role; GRANT EXECUTE ON FUNCTION public.claim_saved_composition(p_save_code character varying, p_student_name text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_data() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.cleanup_expired_data() TO service_role;
REVOKE ALL ON FUNCTION public.create_praatplaat(p_name text, p_theme_id text, p_location_id text, p_image_url text, p_class_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.create_praatplaat(p_name text, p_theme_id text, p_location_id text, p_image_url text, p_class_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.create_praatplaat(p_name text, p_theme_id text, p_location_id text, p_image_url text, p_class_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.create_praatplaat(p_name text, p_theme_id text, p_location_id text, p_image_url text, p_class_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.create_praatplaat(p_name text, p_theme_id text, p_location_id text, p_image_url text, p_class_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.deactivate_class_assignment(p_class_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.deactivate_class_assignment(p_class_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.deactivate_class_assignment(p_class_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.deactivate_class_assignment(p_class_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.deactivate_class_assignment(p_class_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.deactivate_praatplaat(p_praatplaat_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.deactivate_praatplaat(p_praatplaat_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.deactivate_praatplaat(p_praatplaat_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.deactivate_praatplaat(p_praatplaat_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.deactivate_praatplaat(p_praatplaat_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.delete_praatplaat(p_praatplaat_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.delete_praatplaat(p_praatplaat_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.delete_praatplaat(p_praatplaat_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.delete_praatplaat(p_praatplaat_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.delete_praatplaat(p_praatplaat_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_single_active_assignment() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.enforce_single_active_assignment() TO authenticated; GRANT EXECUTE ON FUNCTION public.enforce_single_active_assignment() TO anon; GRANT EXECUTE ON FUNCTION public.enforce_single_active_assignment() TO service_role; GRANT EXECUTE ON FUNCTION public.enforce_single_active_assignment() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_class_code() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_class_code() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_class_code() TO anon; GRANT EXECUTE ON FUNCTION public.generate_class_code() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_class_code() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_praatplaat_share_code() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_praatplaat_share_code() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_praatplaat_share_code() TO anon; GRANT EXECUTE ON FUNCTION public.generate_praatplaat_share_code() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_praatplaat_share_code() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_save_code() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_save_code() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_save_code() TO anon; GRANT EXECUTE ON FUNCTION public.generate_save_code() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_save_code() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_save_secret() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_save_secret() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_save_secret() TO anon; GRANT EXECUTE ON FUNCTION public.generate_save_secret() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_save_secret() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_share_code() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_share_code() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_share_code() TO anon; GRANT EXECUTE ON FUNCTION public.generate_share_code() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_share_code() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_share_code_v2() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_share_code_v2() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_share_code_v2() TO anon; GRANT EXECUTE ON FUNCTION public.generate_share_code_v2() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_share_code_v2() TO PUBLIC;
REVOKE ALL ON FUNCTION public.generate_template_code() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.generate_template_code() TO authenticated; GRANT EXECUTE ON FUNCTION public.generate_template_code() TO anon; GRANT EXECUTE ON FUNCTION public.generate_template_code() TO service_role; GRANT EXECUTE ON FUNCTION public.generate_template_code() TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_assignment(p_class_code text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_active_assignment(p_class_code text) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_active_assignment(p_class_code text) TO anon; GRANT EXECUTE ON FUNCTION public.get_active_assignment(p_class_code text) TO service_role; GRANT EXECUTE ON FUNCTION public.get_active_assignment(p_class_code text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_praatplaat(p_class_code text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_active_praatplaat(p_class_code text) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_active_praatplaat(p_class_code text) TO anon; GRANT EXECUTE ON FUNCTION public.get_active_praatplaat(p_class_code text) TO service_role; GRANT EXECUTE ON FUNCTION public.get_active_praatplaat(p_class_code text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_builtin_lesson_cards() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_builtin_lesson_cards() TO authenticated; GRANT EXECUTE ON FUNCTION public.get_builtin_lesson_cards() TO anon; GRANT EXECUTE ON FUNCTION public.get_builtin_lesson_cards() TO service_role; GRANT EXECUTE ON FUNCTION public.get_builtin_lesson_cards() TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_class_by_code(p_code character) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_class_by_code(p_code character) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_class_by_code(p_code character) TO anon; GRANT EXECUTE ON FUNCTION public.get_class_by_code(p_code character) TO service_role; GRANT EXECUTE ON FUNCTION public.get_class_by_code(p_code character) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_peer_compliments(p_save_code character varying) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_peer_compliments(p_save_code character varying) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_peer_compliments(p_save_code character varying) TO anon; GRANT EXECUTE ON FUNCTION public.get_peer_compliments(p_save_code character varying) TO service_role; GRANT EXECUTE ON FUNCTION public.get_peer_compliments(p_save_code character varying) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_peer_review_batch(p_class_code text, p_own_submission_id uuid, p_batch_size integer) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_peer_review_batch(p_class_code text, p_own_submission_id uuid, p_batch_size integer) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_peer_review_batch(p_class_code text, p_own_submission_id uuid, p_batch_size integer) TO anon; GRANT EXECUTE ON FUNCTION public.get_peer_review_batch(p_class_code text, p_own_submission_id uuid, p_batch_size integer) TO service_role; GRANT EXECUTE ON FUNCTION public.get_peer_review_batch(p_class_code text, p_own_submission_id uuid, p_batch_size integer) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_peer_stars_for_class(p_class_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_peer_stars_for_class(p_class_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_peer_stars_for_class(p_class_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.get_peer_stars_for_class(p_class_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid, p_class_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid, p_class_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid, p_class_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid, p_class_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.get_praatplaat_submissions(p_praatplaat_id uuid, p_class_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_shared_class_album(p_code character varying) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_shared_class_album(p_code character varying) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_shared_class_album(p_code character varying) TO anon; GRANT EXECUTE ON FUNCTION public.get_shared_class_album(p_code character varying) TO service_role; GRANT EXECUTE ON FUNCTION public.get_shared_class_album(p_code character varying) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_shared_composition(p_code character varying) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_shared_composition(p_code character varying) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_shared_composition(p_code character varying) TO anon; GRANT EXECUTE ON FUNCTION public.get_shared_composition(p_code character varying) TO service_role; GRANT EXECUTE ON FUNCTION public.get_shared_composition(p_code character varying) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_shared_praatplaat(p_code character varying) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_shared_praatplaat(p_code character varying) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_shared_praatplaat(p_code character varying) TO anon; GRANT EXECUTE ON FUNCTION public.get_shared_praatplaat(p_code character varying) TO service_role; GRANT EXECUTE ON FUNCTION public.get_shared_praatplaat(p_code character varying) TO PUBLIC;
REVOKE ALL ON FUNCTION public.get_template_by_code(p_code character varying) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.get_template_by_code(p_code character varying) TO authenticated; GRANT EXECUTE ON FUNCTION public.get_template_by_code(p_code character varying) TO anon; GRANT EXECUTE ON FUNCTION public.get_template_by_code(p_code character varying) TO service_role; GRANT EXECUTE ON FUNCTION public.get_template_by_code(p_code character varying) TO PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated; GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon; GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role; GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;
REVOKE ALL ON FUNCTION public.load_saved_composition(p_save_code character varying) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.load_saved_composition(p_save_code character varying) TO authenticated; GRANT EXECUTE ON FUNCTION public.load_saved_composition(p_save_code character varying) TO anon; GRANT EXECUTE ON FUNCTION public.load_saved_composition(p_save_code character varying) TO service_role; GRANT EXECUTE ON FUNCTION public.load_saved_composition(p_save_code character varying) TO PUBLIC;
REVOKE ALL ON FUNCTION public.log_usage_event(p_event text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.log_usage_event(p_event text) TO authenticated; GRANT EXECUTE ON FUNCTION public.log_usage_event(p_event text) TO anon; GRANT EXECUTE ON FUNCTION public.log_usage_event(p_event text) TO service_role; GRANT EXECUTE ON FUNCTION public.log_usage_event(p_event text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.mark_submission_seen(p_submission_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.mark_submission_seen(p_submission_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.mark_submission_seen(p_submission_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.mark_submission_seen(p_submission_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.mark_submission_seen(p_submission_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.peer_review_is_open(p_class_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.peer_review_is_open(p_class_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.peer_review_is_open(p_class_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.peer_review_is_open(p_class_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.peer_review_is_open(p_class_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text, p_email text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text, p_email text) TO authenticated; GRANT EXECUTE ON FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text, p_email text) TO anon; GRANT EXECUTE ON FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text, p_email text) TO service_role; GRANT EXECUTE ON FUNCTION public.save_composition_online(p_student_name text, p_composition_name text, p_composition_data jsonb, p_class_code text, p_email text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.set_assignment_peer_review(p_assignment_id uuid, p_enabled boolean, p_feedback_card_id uuid, p_close_after_minutes integer) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.set_assignment_peer_review(p_assignment_id uuid, p_enabled boolean, p_feedback_card_id uuid, p_close_after_minutes integer) TO authenticated; GRANT EXECUTE ON FUNCTION public.set_assignment_peer_review(p_assignment_id uuid, p_enabled boolean, p_feedback_card_id uuid, p_close_after_minutes integer) TO anon; GRANT EXECUTE ON FUNCTION public.set_assignment_peer_review(p_assignment_id uuid, p_enabled boolean, p_feedback_card_id uuid, p_close_after_minutes integer) TO service_role; GRANT EXECUTE ON FUNCTION public.set_assignment_peer_review(p_assignment_id uuid, p_enabled boolean, p_feedback_card_id uuid, p_close_after_minutes integer) TO PUBLIC;
REVOKE ALL ON FUNCTION public.set_submission_feedback(p_submission_id uuid, p_sticker text, p_level smallint, p_text text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.set_submission_feedback(p_submission_id uuid, p_sticker text, p_level smallint, p_text text) TO authenticated; GRANT EXECUTE ON FUNCTION public.set_submission_feedback(p_submission_id uuid, p_sticker text, p_level smallint, p_text text) TO anon; GRANT EXECUTE ON FUNCTION public.set_submission_feedback(p_submission_id uuid, p_sticker text, p_level smallint, p_text text) TO service_role; GRANT EXECUTE ON FUNCTION public.set_submission_feedback(p_submission_id uuid, p_sticker text, p_level smallint, p_text text) TO PUBLIC;
REVOKE ALL ON FUNCTION public.share_class_album(p_assignment_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.share_class_album(p_assignment_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.share_class_album(p_assignment_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.share_class_album(p_assignment_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.share_class_album(p_assignment_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.share_composition(p_student_name text, p_composition_name text, p_composition_data jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.share_composition(p_student_name text, p_composition_name text, p_composition_data jsonb) TO authenticated; GRANT EXECUTE ON FUNCTION public.share_composition(p_student_name text, p_composition_name text, p_composition_data jsonb) TO anon; GRANT EXECUTE ON FUNCTION public.share_composition(p_student_name text, p_composition_name text, p_composition_data jsonb) TO service_role; GRANT EXECUTE ON FUNCTION public.share_composition(p_student_name text, p_composition_name text, p_composition_data jsonb) TO PUBLIC;
REVOKE ALL ON FUNCTION public.share_praatplaat(p_praatplaat_id uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.share_praatplaat(p_praatplaat_id uuid) TO authenticated; GRANT EXECUTE ON FUNCTION public.share_praatplaat(p_praatplaat_id uuid) TO anon; GRANT EXECUTE ON FUNCTION public.share_praatplaat(p_praatplaat_id uuid) TO service_role; GRANT EXECUTE ON FUNCTION public.share_praatplaat(p_praatplaat_id uuid) TO PUBLIC;
REVOKE ALL ON FUNCTION public.submit_composition(p_class_code character, p_student_name text, p_composition_name text, p_composition_data jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.submit_composition(p_class_code character, p_student_name text, p_composition_name text, p_composition_data jsonb) TO authenticated; GRANT EXECUTE ON FUNCTION public.submit_composition(p_class_code character, p_student_name text, p_composition_name text, p_composition_data jsonb) TO anon; GRANT EXECUTE ON FUNCTION public.submit_composition(p_class_code character, p_student_name text, p_composition_name text, p_composition_data jsonb) TO service_role; GRANT EXECUTE ON FUNCTION public.submit_composition(p_class_code character, p_student_name text, p_composition_name text, p_composition_data jsonb) TO PUBLIC;
REVOKE ALL ON FUNCTION public.submit_or_update_composition(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO authenticated; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO anon; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO service_role; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO PUBLIC;
REVOKE ALL ON FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO authenticated; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO anon; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO service_role; GRANT EXECUTE ON FUNCTION public.submit_or_update_composition_v2(p_class_code text, p_student_name text, p_composition_name text, p_composition_data jsonb, p_client_id uuid, p_assignment_id uuid, p_assignment_type text, p_assignment_ref text, p_praatplaat_position_x real, p_praatplaat_position_y real) TO PUBLIC;
REVOKE ALL ON FUNCTION public.submit_peer_feedback(p_from_submission_id uuid, p_target_submission_id uuid, p_chips text[]) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(p_from_submission_id uuid, p_target_submission_id uuid, p_chips text[]) TO authenticated; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(p_from_submission_id uuid, p_target_submission_id uuid, p_chips text[]) TO anon; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(p_from_submission_id uuid, p_target_submission_id uuid, p_chips text[]) TO service_role; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback(p_from_submission_id uuid, p_target_submission_id uuid, p_chips text[]) TO PUBLIC;
REVOKE ALL ON FUNCTION public.submit_peer_feedback_v2(p_from_submission_id uuid, p_target_submission_id uuid, p_ratings jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback_v2(p_from_submission_id uuid, p_target_submission_id uuid, p_ratings jsonb) TO authenticated; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback_v2(p_from_submission_id uuid, p_target_submission_id uuid, p_ratings jsonb) TO anon; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback_v2(p_from_submission_id uuid, p_target_submission_id uuid, p_ratings jsonb) TO service_role; GRANT EXECUTE ON FUNCTION public.submit_peer_feedback_v2(p_from_submission_id uuid, p_target_submission_id uuid, p_ratings jsonb) TO PUBLIC;
REVOKE ALL ON FUNCTION public.submit_praatplaat_composition(p_class_code text, p_praatplaat_id uuid, p_position_x real, p_position_y real, p_student_name text, p_composition_name text, p_composition_data jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.submit_praatplaat_composition(p_class_code text, p_praatplaat_id uuid, p_position_x real, p_position_y real, p_student_name text, p_composition_name text, p_composition_data jsonb) TO authenticated; GRANT EXECUTE ON FUNCTION public.submit_praatplaat_composition(p_class_code text, p_praatplaat_id uuid, p_position_x real, p_position_y real, p_student_name text, p_composition_name text, p_composition_data jsonb) TO anon; GRANT EXECUTE ON FUNCTION public.submit_praatplaat_composition(p_class_code text, p_praatplaat_id uuid, p_position_x real, p_position_y real, p_student_name text, p_composition_name text, p_composition_data jsonb) TO service_role; GRANT EXECUTE ON FUNCTION public.submit_praatplaat_composition(p_class_code text, p_praatplaat_id uuid, p_position_x real, p_position_y real, p_student_name text, p_composition_name text, p_composition_data jsonb) TO PUBLIC;
REVOKE ALL ON FUNCTION public.touch_lesson_cards_updated_at() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.touch_lesson_cards_updated_at() TO authenticated; GRANT EXECUTE ON FUNCTION public.touch_lesson_cards_updated_at() TO anon; GRANT EXECUTE ON FUNCTION public.touch_lesson_cards_updated_at() TO service_role; GRANT EXECUTE ON FUNCTION public.touch_lesson_cards_updated_at() TO PUBLIC;
REVOKE ALL ON FUNCTION public.update_saved_composition(p_save_code character varying, p_save_secret character varying, p_composition_data jsonb, p_composition_name text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.update_saved_composition(p_save_code character varying, p_save_secret character varying, p_composition_data jsonb, p_composition_name text) TO authenticated; GRANT EXECUTE ON FUNCTION public.update_saved_composition(p_save_code character varying, p_save_secret character varying, p_composition_data jsonb, p_composition_name text) TO anon; GRANT EXECUTE ON FUNCTION public.update_saved_composition(p_save_code character varying, p_save_secret character varying, p_composition_data jsonb, p_composition_name text) TO service_role; GRANT EXECUTE ON FUNCTION public.update_saved_composition(p_save_code character varying, p_save_secret character varying, p_composition_data jsonb, p_composition_name text) TO PUBLIC;

-- ====
-- TRIGGERS

-- ====
CREATE TRIGGER enforce_max_classes BEFORE INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION check_max_classes();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER trg_enforce_single_active_assignment BEFORE INSERT OR UPDATE OF is_active ON public.class_assignments FOR EACH ROW EXECUTE FUNCTION enforce_single_active_assignment();
CREATE TRIGGER trg_lesson_cards_updated_at BEFORE UPDATE ON public.lesson_cards FOR EACH ROW EXECUTE FUNCTION touch_lesson_cards_updated_at();