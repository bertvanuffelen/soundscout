# Plan: Klas-code Systeem

**Status**: 📋 Gepland (niet geïmplementeerd)
**Prioriteit**: Medium - na core app completion
**Backend**: Supabase

---

## 1. Overzicht

Het klas-code systeem stelt docenten in staat om:
- Een unieke klas-code aan te maken (bijv. `KLAS-5B-2025`)
- Composities van leerlingen te verzamelen en bekijken
- Voortgang van de klas te monitoren

Leerlingen kunnen:
- Een klas-code invoeren bij het delen
- Hun compositie koppelen aan een klas
- Composities van klasgenoten beluisteren (optioneel)

---

## 2. User Flows

### 2.1 Docent Flow
```
1. Docent opent SoundScout
2. Kiest "Ik ben docent"
3. Logt in (Supabase Auth - magic link of wachtwoord)
4. Ziet dashboard met:
   - Bestaande klassen
   - "Nieuwe klas aanmaken" button
5. Maakt klas aan → krijgt klas-code
6. Deelt klas-code met leerlingen
7. Ziet binnenkomende composities in dashboard
```

### 2.2 Leerling Flow
```
1. Leerling speelt SoundScout (geen login nodig)
2. Maakt compositie in Studio
3. Gaat naar Club → "Delen"
4. Voert klas-code in (optioneel)
5. Compositie wordt geüpload naar Supabase
6. Krijgt bevestiging + deel-link
```

---

## 3. Supabase Database Schema

### 3.1 Tabellen

```sql
-- Docenten (gekoppeld aan Supabase Auth)
CREATE TABLE teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  school_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Klassen
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Groep 5B"
  class_code TEXT UNIQUE NOT NULL,       -- "KLAS-5B-2025"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Composities (van leerlingen)
CREATE TABLE compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  student_name TEXT,                     -- Optioneel, anoniem mogelijk
  name TEXT NOT NULL,                    -- Compositie naam
  share_code TEXT UNIQUE NOT NULL,       -- "ABCD-1234"
  timeline_data JSONB NOT NULL,          -- TimelineState
  samples_data JSONB NOT NULL,           -- Sample[]
  metadata JSONB,                        -- CompositionMetadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  plays_count INTEGER DEFAULT 0
);

-- Indices
CREATE INDEX idx_compositions_class ON compositions(class_id);
CREATE INDEX idx_compositions_share_code ON compositions(share_code);
CREATE INDEX idx_classes_code ON classes(class_code);
```

### 3.2 Row Level Security (RLS)

```sql
-- Docenten kunnen alleen hun eigen klassen zien
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers see own classes" ON classes
  FOR SELECT USING (teacher_id = auth.uid());

-- Composities: iedereen kan lezen (voor delen), maar alleen via class_id als docent
ALTER TABLE compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read via share_code" ON compositions
  FOR SELECT USING (TRUE);
CREATE POLICY "Insert for everyone" ON compositions
  FOR INSERT WITH CHECK (TRUE);
```

---

## 4. Frontend Componenten (Later)

### 4.1 Nieuwe Schermen
- `/teacher` - Docenten login/dashboard
- `/teacher/class/:id` - Klas detail met composities
- `/listen/:shareCode` - Publieke luisterpagina
- `/join` - Klas-code invoer pagina

### 4.2 Nieuwe Components
- `ClassCodeInput` - Invoerveld voor klas-code
- `ShareModal` - Modal bij delen met klas-code optie
- `TeacherDashboard` - Overzicht klassen
- `CompositionCard` - Kaart voor compositie in dashboard
- `PublicPlayer` - Afspeler voor gedeelde composities

---

## 5. Types & Store (NU voorbereiden)

### 5.1 Types toevoegen aan `types/index.ts`

```typescript
// Gebruikersrollen
export type UserRole = 'guest' | 'student' | 'teacher';

// Klas informatie
export interface ClassInfo {
  id: string;
  name: string;
  classCode: string;
  teacherId: string;
  createdAt: string;
  isActive: boolean;
}

// Sessie context (wie is ingelogd, welke klas actief)
export interface UserSession {
  role: UserRole;

  // Voor docenten (ingelogd via Supabase)
  teacherId?: string;
  teacherName?: string;

  // Voor leerlingen (geen login, maar wel klas-code)
  activeClassCode?: string;
  studentName?: string;
}

// Gedeelde compositie (wat naar server gaat)
export interface SharedComposition {
  id: string;
  name: string;
  studentName?: string;
  classCode?: string;
  shareCode: string;
  timeline: TimelineState;
  samples: Sample[];
  metadata: CompositionMetadata;
  createdAt: string;
  playsCount: number;
}
```

### 5.2 Store: `useUserStore.ts`

```typescript
interface UserState {
  // Huidige sessie
  session: UserSession;

  // Actions
  setRole: (role: UserRole) => void;
  setActiveClassCode: (code: string | undefined) => void;
  setStudentName: (name: string) => void;

  // Voor docenten
  loginAsTeacher: (teacherId: string, name: string) => void;
  logout: () => void;
}
```

---

## 6. Implementatie Fases

### Fase A: Types & Store (NU)
- [ ] Types toevoegen aan `types/index.ts`
- [ ] `useUserStore.ts` aanmaken (basis)
- [ ] Geen UI changes

### Fase B: Supabase Setup (LATER)
- [ ] Supabase project configureren
- [ ] Database schema aanmaken
- [ ] RLS policies instellen
- [ ] Environment variables toevoegen

### Fase C: Delen Flow (LATER)
- [ ] ShareModal component
- [ ] Klas-code invoer bij delen
- [ ] Upload naar Supabase
- [ ] Bevestiging + share link

### Fase D: Docenten Dashboard (LATER)
- [ ] Login flow (magic link)
- [ ] Dashboard UI
- [ ] Klas aanmaken
- [ ] Composities bekijken

### Fase E: Publieke Luisterpagina (LATER)
- [ ] Route `/listen/:shareCode`
- [ ] Compositie ophalen
- [ ] Afspelen zonder login

---

## 7. Open Vragen

1. **Authenticatie docenten**: Magic link of wachtwoord?
2. **Leerling namen**: Verplicht of optioneel?
3. **Privacy**: Mogen leerlingen elkaars werk zien?
4. **Moderatie**: Kan docent composities verbergen/verwijderen?
5. **Limieten**: Max composities per klas?

---

## 8. Afhankelijkheden

- Supabase account ✅ (user heeft dit)
- `@supabase/supabase-js` package
- Environment variables voor Supabase URL + anon key

---

## Notities

*Laatste update: 2025-02-01*

Dit plan wordt geïmplementeerd NA voltooiing van de core app (Fase 1-3).
Focus nu op architectuur voorbereiding (types + store).
