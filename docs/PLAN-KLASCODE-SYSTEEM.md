# Plan: Klas-code Systeem - Uitgebreid Implementatieplan

**Status**: 🚧 In ontwikkeling
**Prioriteit**: P1 - Hoge prioriteit
**Backend**: Supabase
**Laatste update**: 2026-02-01

---

## Inhoudsopgave

1. [Overzicht & Beslissingen](#1-overzicht--beslissingen)
2. [Privacy & GDPR Compliance](#2-privacy--gdpr-compliance)
3. [Architectuur](#3-architectuur)
4. [Database Schema](#4-database-schema)
5. [Supabase Setup](#5-supabase-setup)
6. [Frontend Implementatie](#6-frontend-implementatie)
7. [Random Namen Generator](#7-random-namen-generator)
8. [Implementatie Stappenplan](#8-implementatie-stappenplan)
9. [Voortgang & Notities](#9-voortgang--notities)

---

## 1. Overzicht & Beslissingen

### 1.1 Kernprincipes

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| **Accounts voor kinderen** | ❌ Geen | Privacy (GDPR), geen wachtwoorden voor kinderen |
| **Accounts voor docenten** | ✅ Ja | Email/wachtwoord login |
| **Leerling naam** | Optioneel | Privacy-vriendelijk, grappige fallback naam |
| **Klas-code formaat** | 4 cijfers | Makkelijk voor kinderen (bijv. `7392`) |
| **Data eigenaar** | Docent | School/docent is data controller |

### 1.2 User Flows

#### Docent Flow
```
1. Docent registreert account (email + wachtwoord)
2. Docent maakt klas aan → krijgt 4-cijferige code (bijv. "7392")
3. Docent geeft klasnaam (bijv. "Klas 2B")
4. Docent deelt code met leerlingen (mondeling/op bord)
5. Docent ziet dashboard met alle ontvangen composities
6. Docent kan composities afspelen en verwijderen
```

#### Leerling Flow
```
1. Leerling maakt compositie in SoundScout (lokaal)
2. Leerling klikt "Deel met docent"
3. Leerling voert klas-code in (4 cijfers)
4. Leerling voert naam in (optioneel)
   → Geen naam? Krijgt grappige naam (bijv. "Vrolijke Papegaai")
5. Compositie wordt verzonden
6. Klaar! Geen account, geen wachtwoord
```

### 1.3 Wat de docent ziet

- **Dashboard**: Overzicht van alle klassen
- **Per klas**: Lijst van ontvangen composities
  - Leerling naam (of gegenereerde naam)
  - Compositie naam
  - Datum/tijd van inzending
  - Afspeel-knop
  - Verwijder-knop
- **Klas beheer**: Klas hernoemen, verwijderen

### 1.4 Wenslijst (Later)

- [ ] MP3 download voor docent
- [ ] Leerling kan compositie importeren vanuit docent-link
- [ ] Docent kan feedback/sterren geven
- [ ] Bulk verwijderen van composities

---

## 2. Privacy & GDPR Compliance

### 2.1 Waarom dit privacy-vriendelijk is

| Aspect | Onze aanpak | GDPR voordeel |
|--------|-------------|---------------|
| Geen accounts voor kinderen | ✅ | Geen profiling, geen tracking |
| Optionele naam (nickname) | ✅ | Data minimalisatie |
| School als data controller | ✅ | Legitieme educatieve basis |
| Geen analytics op kinderen | ✅ | Geen surveillance |
| Geen cookies/tracking | ✅ | Geen consent nodig |

### 2.2 Wat we WEL verzamelen

- Compositie data (muziek/samples - dit is schoolwerk)
- Optionele leerling naam/bijnaam
- Tijdstip van inzending
- Klas-code koppeling

### 2.3 Wat we NIET verzamelen

- ❌ IP-adressen
- ❌ Email van kinderen
- ❌ Leeftijd/geboortedatum
- ❌ Device identifiers
- ❌ Gedragsdata/analytics
- ❌ Foto's/video's
- ❌ Locatiedata

### 2.4 Informatie voor scholen

**Privacy statement (kort)**:
> SoundScout verzamelt alleen muziekcomposities en optionele bijnamen van leerlingen.
> Er worden geen accounts voor kinderen aangemaakt. De school/docent beheert alle data
> en kan deze op elk moment verwijderen. Wij gebruiken geen tracking, cookies of analytics.

### 2.5 Data retention

- Composities blijven bewaard totdat docent ze verwijdert
- Bij verwijderen klas: alle composities worden verwijderd
- Aanbeveling aan docenten: opschonen aan eind schooljaar

---

## 3. Architectuur

### 3.1 Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ SoundScout  │  │   Docent    │  │    Leerling     │  │
│  │    App      │  │  Dashboard  │  │  Deel Modal     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    Auth     │  │  Database   │  │    Storage      │  │
│  │  (docent)   │  │ (PostgreSQL)│  │  (optioneel)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Project Structuur (nieuw)

```
src/
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── auth.ts                  # Auth helpers
│   └── database.types.ts        # Generated types
├── contexts/
│   └── AuthContext.tsx          # Auth state provider
├── hooks/
│   ├── useAuth.ts               # Auth hook
│   ├── useClasses.ts            # Klassen data
│   └── useSubmissions.ts        # Inzendingen data
├── components/
│   ├── teacher/
│   │   ├── TeacherLogin.tsx
│   │   ├── TeacherRegister.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── ClassCard.tsx
│   │   ├── ClassDetail.tsx
│   │   ├── SubmissionCard.tsx
│   │   └── CreateClassModal.tsx
│   └── share/
│       ├── ShareWithTeacherModal.tsx
│       └── ClassCodeInput.tsx
├── pages/
│   ├── TeacherPage.tsx          # /docent
│   └── TeacherClassPage.tsx     # /docent/klas/:id
└── utils/
    └── randomNames.ts           # Grappige namen generator
```

---

## 4. Database Schema

### 4.1 Tabellen

```sql
-- ============================================
-- TEACHERS (Docenten)
-- ============================================
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  school_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLASSES (Klassen)
-- ============================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Klas 2B"
  code CHAR(4) UNIQUE NOT NULL,          -- "7392" (4 cijfers)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- SUBMISSIONS (Inzendingen van leerlingen)
-- ============================================
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,            -- Naam of gegenereerde naam
  composition_name TEXT NOT NULL,        -- Naam van de compositie
  composition_data JSONB NOT NULL,       -- Volledige compositie JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX idx_classes_code ON public.classes(code);
CREATE INDEX idx_submissions_class ON public.submissions(class_id);
CREATE INDEX idx_submissions_created ON public.submissions(created_at DESC);
```

### 4.2 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEACHERS POLICIES
-- ============================================
-- Docenten kunnen alleen hun eigen profiel zien
CREATE POLICY "Teachers can read own profile"
  ON public.teachers FOR SELECT
  USING (auth.uid() = id);

-- Docenten kunnen hun profiel updaten
CREATE POLICY "Teachers can update own profile"
  ON public.teachers FOR UPDATE
  USING (auth.uid() = id);

-- Nieuwe docent wordt aangemaakt bij registratie (via trigger)
CREATE POLICY "Allow insert for authenticated users"
  ON public.teachers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- CLASSES POLICIES
-- ============================================
-- Docenten kunnen alleen hun eigen klassen zien
CREATE POLICY "Teachers can read own classes"
  ON public.classes FOR SELECT
  USING (auth.uid() = teacher_id);

-- Docenten kunnen klassen aanmaken
CREATE POLICY "Teachers can create classes"
  ON public.classes FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Docenten kunnen hun klassen updaten
CREATE POLICY "Teachers can update own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Docenten kunnen hun klassen verwijderen
CREATE POLICY "Teachers can delete own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = teacher_id);

-- Iedereen kan klas opzoeken via code (voor validatie)
CREATE POLICY "Anyone can lookup class by code"
  ON public.classes FOR SELECT
  USING (TRUE);

-- ============================================
-- SUBMISSIONS POLICIES
-- ============================================
-- BELANGRIJK: Leerlingen kunnen inzenden ZONDER login
CREATE POLICY "Anyone can submit compositions"
  ON public.submissions FOR INSERT
  WITH CHECK (TRUE);

-- Docenten kunnen submissions van hun klassen zien
CREATE POLICY "Teachers can read submissions of own classes"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = submissions.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Docenten kunnen submissions verwijderen
CREATE POLICY "Teachers can delete submissions of own classes"
  ON public.submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = submissions.class_id
      AND classes.teacher_id = auth.uid()
    )
  );
```

### 4.3 Helper Functions

```sql
-- ============================================
-- Genereer unieke 4-cijferige klas-code
-- ============================================
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS CHAR(4) AS $$
DECLARE
  new_code CHAR(4);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Genereer random 4-cijferige code (1000-9999)
    new_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- Check of code al bestaat
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE code = new_code) INTO code_exists;

    -- Als niet bestaat, return
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Zoek klas op basis van code (voor leerlingen)
-- ============================================
CREATE OR REPLACE FUNCTION get_class_by_code(p_code CHAR(4))
RETURNS TABLE (
  id UUID,
  name TEXT,
  teacher_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    t.display_name as teacher_name
  FROM public.classes c
  JOIN public.teachers t ON t.id = c.teacher_id
  WHERE c.code = p_code
  AND c.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon (voor niet-ingelogde leerlingen)
GRANT EXECUTE ON FUNCTION get_class_by_code TO anon;

-- ============================================
-- Submit compositie (voor leerlingen zonder login)
-- ============================================
CREATE OR REPLACE FUNCTION submit_composition(
  p_class_code CHAR(4),
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_class_id UUID;
  v_submission_id UUID;
BEGIN
  -- Zoek klas
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE code = p_class_code AND is_active = TRUE;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Klas-code niet gevonden';
  END IF;

  -- Insert submission
  INSERT INTO public.submissions (class_id, student_name, composition_name, composition_data)
  VALUES (v_class_id, p_student_name, p_composition_name, p_composition_data)
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION submit_composition TO anon;
```

### 4.4 Trigger: Maak teacher profiel bij registratie

```sql
-- Trigger functie
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 5. Supabase Setup

### 5.1 Project Configuratie

**Benodigde stappen:**

1. **Maak Supabase project aan** op [supabase.com](https://supabase.com)
2. **Noteer credentials**:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon key: `eyJhbGciOiJIUzI1NiIs...`
3. **Voer SQL uit** (zie sectie 4)

### 5.2 Environment Variables

Maak `.env.local` aan (wordt niet gecommit):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Voeg toe aan `.gitignore`:
```
.env.local
.env.*.local
```

### 5.3 Supabase Client Setup

**`src/lib/supabase.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### 5.4 Auth Helpers

**`src/lib/auth.ts`**:
```typescript
import { supabase } from './supabase';

export const signUpTeacher = async (
  email: string,
  password: string,
  displayName: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  return data.user;
};

export const signInTeacher = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};
```

### 5.5 Packages Installeren

```bash
npm install @supabase/supabase-js
```

---

## 6. Frontend Implementatie

### 6.1 Auth Context

**`src/contexts/AuthContext.tsx`**:
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isTeacher: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 6.2 Klassen Hook

**`src/hooks/useClasses.ts`**:
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Class {
  id: string;
  name: string;
  code: string;
  created_at: string;
  is_active: boolean;
  submission_count?: number;
}

export function useClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          submissions:submissions(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClasses(data.map(c => ({
        ...c,
        submission_count: c.submissions?.[0]?.count || 0
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij laden');
    } finally {
      setLoading(false);
    }
  };

  const createClass = async (name: string) => {
    if (!user) throw new Error('Niet ingelogd');

    // Genereer code via database functie
    const { data: codeData } = await supabase.rpc('generate_class_code');
    const code = codeData as string;

    const { data, error } = await supabase
      .from('classes')
      .insert({ teacher_id: user.id, name, code })
      .select()
      .single();

    if (error) throw error;

    setClasses(prev => [data, ...prev]);
    return data;
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setClasses(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  return { classes, loading, error, createClass, deleteClass, refetch: fetchClasses };
}
```

### 6.3 Submissions Hook

**`src/hooks/useSubmissions.ts`**:
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Submission {
  id: string;
  student_name: string;
  composition_name: string;
  composition_data: any;
  created_at: string;
}

export function useSubmissions(classId: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data);
    } finally {
      setLoading(false);
    }
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    if (classId) fetchSubmissions();
  }, [classId]);

  return { submissions, loading, deleteSubmission, refetch: fetchSubmissions };
}
```

### 6.4 Submit Compositie (voor leerlingen)

**`src/lib/submissions.ts`**:
```typescript
import { supabase } from './supabase';
import { generateRandomDutchName } from '../utils/randomNames';

interface SubmitCompositionParams {
  classCode: string;
  studentName?: string;
  compositionName: string;
  compositionData: any;
}

export async function submitComposition({
  classCode,
  studentName,
  compositionName,
  compositionData,
}: SubmitCompositionParams) {
  // Gebruik grappige naam als geen naam opgegeven
  const finalStudentName = studentName?.trim() || generateRandomDutchName();

  const { data, error } = await supabase.rpc('submit_composition', {
    p_class_code: classCode,
    p_student_name: finalStudentName,
    p_composition_name: compositionName,
    p_composition_data: compositionData,
  });

  if (error) {
    if (error.message.includes('niet gevonden')) {
      throw new Error('Klas-code niet gevonden. Controleer de code en probeer opnieuw.');
    }
    throw error;
  }

  return { id: data, studentName: finalStudentName };
}

export async function validateClassCode(code: string) {
  const { data, error } = await supabase.rpc('get_class_by_code', {
    p_code: code,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data[0];
}
```

---

## 7. Random Namen Generator

### 7.1 Nederlandse Grappige Namen

**`src/utils/randomNames.ts`**:
```typescript
const adjectives = [
  'Vrolijke', 'Dansende', 'Zingende', 'Springende', 'Fluitende',
  'Huppelende', 'Grappige', 'Stralende', 'Blije', 'Speelse',
  'Snelle', 'Slimme', 'Dappere', 'Levendige', 'Kleurrijke',
  'Schitterende', 'Galopperende', 'Twirbelende', 'Zwiepende',
  'Glinsterende', 'Piepende', 'Trippelende', 'Stuiterende',
  'Fladderende', 'Hopsende', 'Tollende', 'Swingense', 'Rockende',
  'Drummende', 'Tokkellende',
];

const nouns = [
  // Dieren
  'Papegaai', 'Zeehond', 'Pinguïn', 'Uil', 'Konijn',
  'Dolfijn', 'Aap', 'Panda', 'Kat', 'Vogel',
  'Egel', 'Vos', 'Hond', 'Ijsbeer', 'Eenhoorn',
  'Kangoeroe', 'Flamingo', 'Wasbeer', 'Otter', 'Koala',
  // Muziek/geluid objecten
  'Robot', 'Trompet', 'Piano', 'Trommel', 'Fluit',
  'Xylofoon', 'Gitaar', 'Tamboerijn', 'Viool', 'Synthesizer',
  'Bel', 'Gong', 'Marimba', 'Orgel', 'Bas',
];

/**
 * Genereert een grappige Nederlandse naam voor anonieme gebruikers
 * @returns Naam zoals "Vrolijke Papegaai" of "Dansende Robot"
 */
export function generateRandomDutchName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

/**
 * Genereert meerdere unieke namen
 */
export function generateMultipleNames(count: number): string[] {
  const used = new Set<string>();
  const names: string[] = [];
  const maxAttempts = count * 3;
  let attempts = 0;

  while (names.length < count && attempts < maxAttempts) {
    const name = generateRandomDutchName();
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
    attempts++;
  }

  return names;
}
```

### 7.2 Mogelijke combinaties

- **30 bijvoeglijke naamwoorden × 35 zelfstandige naamwoorden = 1050+ combinaties**
- Voorbeelden: "Vrolijke Papegaai", "Dansende Robot", "Zingende Zeehond", "Rockende Kangoeroe"

---

## 8. Implementatie Stappenplan

### Fase 1: Supabase Setup ⬜
- [ ] Supabase project aanmaken
- [ ] Environment variables configureren
- [ ] Database schema uitvoeren (SQL)
- [ ] RLS policies instellen
- [ ] Test queries uitvoeren

### Fase 2: Auth & Context ⬜
- [ ] `@supabase/supabase-js` installeren
- [ ] `src/lib/supabase.ts` aanmaken
- [ ] `src/lib/auth.ts` aanmaken
- [ ] `src/contexts/AuthContext.tsx` aanmaken
- [ ] AuthProvider in App.tsx wrappen

### Fase 3: Docent Login/Registratie ⬜
- [ ] `TeacherLogin.tsx` component
- [ ] `TeacherRegister.tsx` component
- [ ] Route `/docent` aanmaken
- [ ] Redirect na login

### Fase 4: Docent Dashboard ⬜
- [ ] `TeacherDashboard.tsx` component
- [ ] `ClassCard.tsx` component
- [ ] `CreateClassModal.tsx` component
- [ ] Klassen CRUD implementeren
- [ ] `useClasses` hook

### Fase 5: Klas Detail ⬜
- [ ] `ClassDetail.tsx` component
- [ ] `SubmissionCard.tsx` component
- [ ] Route `/docent/klas/:id`
- [ ] Submissions laden
- [ ] Afspelen van composities
- [ ] Verwijderen van composities

### Fase 6: Leerling Delen Flow ⬜
- [ ] `ShareWithTeacherModal.tsx` component
- [ ] `ClassCodeInput.tsx` component
- [ ] Klas-code validatie
- [ ] `submitComposition` functie
- [ ] Random naam fallback
- [ ] Succes/error feedback

### Fase 7: Integratie & Polish ⬜
- [ ] "Deel met docent" knop in Club/Compositions
- [ ] Loading states overal
- [ ] Error handling
- [ ] Responsive design
- [ ] i18n (Nederlands)

### Fase 8: Testen & Documentatie ⬜
- [ ] E2E test: registratie → klas aanmaken → compositie ontvangen
- [ ] Test met echte gebruikers (school)
- [ ] Documentatie voor docenten

---

## 9. Voortgang & Notities

### Sessie Log

**2026-02-01 - Start**
- [x] Onderzoek Supabase integratie voltooid
- [x] Onderzoek privacy/GDPR voltooid
- [x] Random namen generator ontworpen
- [x] Implementatieplan geschreven
- [ ] Wachten op Supabase credentials van gebruiker

### Open Items

1. **Supabase project**: Gebruiker zoekt credentials op
2. **Email verificatie**: Aan of uit? (aanbeveling: uit voor nu, makkelijker testen)
3. **Rate limiting**: Nodig voor submissions? (kan later)

### Beslissingen

| Vraag | Antwoord | Datum |
|-------|----------|-------|
| Accounts voor kinderen? | Nee | 2026-02-01 |
| Naam verplicht? | Nee, optioneel | 2026-02-01 |
| Code formaat? | 4 cijfers | 2026-02-01 |
| Later bewerken? | Nee (wenslijst) | 2026-02-01 |
| Meerdere klassen? | Ja | 2026-02-01 |

---

*Dit document wordt bijgewerkt tijdens de implementatie.*
