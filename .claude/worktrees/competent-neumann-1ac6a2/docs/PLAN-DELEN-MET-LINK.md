# Plan: Delen met Link (#14)

**Datum:** 2026-02-26
**Status:** Plan — wacht op goedkeuring
**Complexiteit:** ⭐⭐⭐ Medium-Hoog
**Vereist:** Supabase (al geconfigureerd)

---

## Samenvatting

Leerlingen kunnen een publieke luisterlink genereren voor hun compositie. De link kan worden geopend via een URL (`soundscout.nl?share=HK7NP3XW`) of door de code in te voeren op het startscherm. De ontvanger ziet een read-only player.

Dit bouwt voort op de bestaande `submissions` tabel — geen nieuwe tabel nodig.

---

## Ontwerpbeslissingen

### Waarom één tabel (Optie A)?

De bestaande `submissions` tabel slaat al dezelfde compositiedata op als wat een publieke share nodig heeft (tracks, clips, samples, bpm, etc.). Een aparte `shares` tabel zou bijna identiek zijn. Door de bestaande tabel uit te breiden met optionele kolommen houden we de codebase simpel en voorkomen we dubbele opslag.

| Scenario | class_id | share_code | Wie ziet het |
|----------|----------|------------|-------------|
| Deel met docent | ✅ ingevuld | NULL | Alleen docent (via dashboard) |
| Maak luisterlink | NULL | ✅ code | Iedereen met link/code |
| Beide | ✅ ingevuld | ✅ code | Docent + iedereen |

### Twee instappunten voor luisterlink

1. **Via URL** — `soundscout.nl?share=HK7NP3XW` → App detecteert query param → toont read-only player
2. **Via startscherm** — Leerling opent SoundScout → voert code in → ziet read-only player

Beide gebruiken dezelfde `get_shared_composition()` functie.

### ON DELETE SET NULL (klas wissen)

De foreign key constraint wordt gewijzigd van `CASCADE` naar `SET NULL`. Als een docent een klas wist:
- Submissions met `share_code` → publieke link blijft werken (class_id wordt NULL)
- Submissions zonder `share_code` → class_id wordt NULL, verdwijnt uit teacher dashboard (query filtert op class_id)

### Verlopen links

- `expires_at` is een timestamp, standaard 30 dagen na aanmaak
- Geen cron-job nodig — de query checkt `expires_at > NOW()`
- Verlopen link → "Deze link is verlopen" melding
- Docent-submissions krijgen `expires_at = NULL` (verlopen nooit)
- Optioneel: maandelijkse cleanup van verlopen rijen (toekomstig, niet in scope)

---

## Database Migratie

Uit te voeren in Supabase SQL Editor. Bestaande data wordt niet aangeraakt.

### 1. Kolommen toevoegen

```sql
ALTER TABLE public.submissions
  ADD COLUMN share_code VARCHAR(8) UNIQUE,
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD COLUMN view_count INT DEFAULT 0;
```

### 2. class_id nullable maken

```sql
ALTER TABLE public.submissions
  ALTER COLUMN class_id DROP NOT NULL;
```

### 3. Foreign key wijzigen naar SET NULL

```sql
ALTER TABLE public.submissions
  DROP CONSTRAINT submissions_class_id_fkey,
  ADD CONSTRAINT submissions_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
```

### 4. Index op share_code

```sql
CREATE INDEX idx_submissions_share_code
  ON public.submissions(share_code)
  WHERE share_code IS NOT NULL;
```

### 5. RLS policy voor publiek lezen

```sql
CREATE POLICY "Anyone can read shared compositions"
  ON public.submissions FOR SELECT
  USING (
    share_code IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );
```

### 6. Share code generator functie

```sql
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS VARCHAR(8) AS $$
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
$$ LANGUAGE plpgsql;
```

Karakterset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (zonder I, O, 0, 1 om verwarring te voorkomen).

### 7. RPC: Compositie delen (publieke link)

```sql
CREATE OR REPLACE FUNCTION share_composition(
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB,
  p_expires_days INT DEFAULT 30
)
RETURNS VARCHAR(8) AS $$
DECLARE
  v_share_code VARCHAR(8);
BEGIN
  v_share_code := generate_share_code();

  INSERT INTO public.submissions (
    class_id, student_name, composition_name, composition_data,
    share_code, expires_at
  ) VALUES (
    NULL,
    p_student_name,
    p_composition_name,
    p_composition_data,
    v_share_code,
    NOW() + (p_expires_days || ' days')::INTERVAL
  );

  RETURN v_share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION share_composition TO anon;
GRANT EXECUTE ON FUNCTION share_composition TO authenticated;
```

### 8. RPC: Gedeelde compositie ophalen

```sql
CREATE OR REPLACE FUNCTION get_shared_composition(p_code VARCHAR(8))
RETURNS TABLE (
  composition_name TEXT,
  student_name TEXT,
  composition_data JSONB,
  created_at TIMESTAMPTZ,
  view_count INT
) AS $$
BEGIN
  -- Verhoog view count
  UPDATE public.submissions
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE share_code = p_code
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN QUERY
  SELECT
    s.composition_name,
    s.student_name,
    s.composition_data,
    s.created_at,
    s.view_count
  FROM public.submissions s
  WHERE s.share_code = p_code
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_shared_composition TO anon;
GRANT EXECUTE ON FUNCTION get_shared_composition TO authenticated;
```

---

## Frontend Implementatie

### Overzicht bestanden

| Bestand | Actie | Beschrijving |
|---------|-------|-------------|
| `src/lib/submissions.ts` | Wijzigen | `shareComposition()` en `getSharedComposition()` toevoegen |
| `src/components/share/ShareLinkModal.tsx` | **Nieuw** | Modal: link genereren + kopieerknop |
| `src/components/share/SharedPlayer.tsx` | **Nieuw** | Publieke read-only player |
| `src/components/share/ShareCodeInput.tsx` | **Nieuw** | Code-invoer component voor startscherm |
| `src/components/stage/StageView.tsx` | Wijzigen | "Deel link" knop toevoegen |
| `src/components/StartScreen.tsx` | Wijzigen | Code-invoer sectie toevoegen |
| `src/App.tsx` | Wijzigen | `?share=` query param detectie + 'shared' scherm |
| `src/stores/gameStore.ts` | Wijzigen | `GameScreen` uitbreiden met `'shared'` |
| `src/types/index.ts` | Wijzigen | `GameScreen` type uitbreiden |
| `src/i18n/locales/nl.json` | Wijzigen | Vertalingen toevoegen |
| `src/i18n/locales/en.json` | Wijzigen | Vertalingen toevoegen |
| `supabase/schema.sql` | Wijzigen | Migratie documenteren |

### Stap 1: Supabase helpers (`src/lib/submissions.ts`)

Twee nieuwe functies toevoegen:

```typescript
/**
 * Genereer een publieke luisterlink voor een compositie
 */
export async function shareComposition(params: {
  studentName: string;
  compositionName: string;
  compositionData: any;
}): Promise<string> {
  const { data, error } = await supabase.rpc('share_composition', {
    p_student_name: params.studentName || 'Anoniem',
    p_composition_name: params.compositionName,
    p_composition_data: params.compositionData,
  });

  if (error) {
    console.error('Fout bij delen:', error);
    throw new Error('Kon link niet aanmaken. Probeer opnieuw.');
  }

  return data as string; // share_code
}

/**
 * Haal een gedeelde compositie op via share code
 */
export async function getSharedComposition(code: string): Promise<{
  composition_name: string;
  student_name: string;
  composition_data: any;
  created_at: string;
  view_count: number;
} | null> {
  const { data, error } = await supabase.rpc('get_shared_composition', {
    p_code: code.toUpperCase().trim(),
  });

  if (error) {
    console.error('Fout bij ophalen gedeelde compositie:', error);
    throw new Error('Kon compositie niet laden.');
  }

  if (!data || data.length === 0) return null;
  return data[0];
}
```

### Stap 2: ShareLinkModal (`src/components/share/ShareLinkModal.tsx`)

Modal die verschijnt na klikken op "Deel link" in StageView.

**Flow:**
1. "Link wordt aangemaakt..." (loading)
2. Succes → Toont link + 8-karakter code + kopieerknop
3. Error → Foutmelding + opnieuw proberen

**UI elementen:**
- Volledige URL in tekstveld (read-only): `https://soundscout.nl?share=HK7NP3XW`
- "Kopieer link" knop (clipboard API)
- De 8-karakter code apart prominent getoond (voor handmatig invoeren)
- Melding: "Link verloopt na 30 dagen"
- Sluiten knop

### Stap 3: SharedPlayer (`src/components/share/SharedPlayer.tsx`)

Publieke read-only player. Hergebruikt logica van `SubmissionPlayer.tsx` maar als volledig scherm (niet als modal).

**Verschillen met SubmissionPlayer:**
- Geen modal overlay — staat op zichzelf als scherm
- SoundScout logo + branding bovenaan
- "Terug naar SoundScout" knop (gaat naar startscherm)
- Verlopen link state: "Deze link is verlopen"
- Niet gevonden state: "Compositie niet gevonden"
- Loading state: "Compositie laden..."

**Hergebruikt van SubmissionPlayer:**
- Audio initialisatie en sample loading
- Read-only Timeline component
- Play/Pause/Stop controls
- Beat tracking via setInterval

### Stap 4: ShareCodeInput (`src/components/share/ShareCodeInput.tsx`)

Klein component voor het startscherm.

**UI:**
- Tekst: "Heb je een code? Beluister een compositie"
- Invoerveld: 8 karakters, hoofdletters, alfanumeriek
- "Beluister" knop
- Foutmeldingen: "Code niet gevonden", "Link is verlopen"

### Stap 5: StageView aanpassen

Nieuwe knop toevoegen tussen "Download MP3" en "Deel met docent":

```
[Opslaan]
[Download MP3]
[Deel link]          ← NIEUW (Link2 icoon van lucide-react)
[Deel met docent]
[Nieuwe compositie]
```

De knop opent `ShareLinkModal`. Net als "Deel met docent" is een compositienaam vereist.

### Stap 6: StartScreen aanpassen

Onder de bestaande knoppen ("Nieuwe compositie", "Mijn composities", etc.) een sectie toevoegen:

```
────────────────────────
Heb je een code?
[________] [Beluister]
────────────────────────
```

Bij het invoeren van een geldige code → navigeer naar `'shared'` scherm.

### Stap 7: App.tsx aanpassen

Bij het laden van de app, check voor `?share=` query parameter:

```typescript
// In AppContent, na theme init:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const shareCode = params.get('share');
  if (shareCode) {
    // Sla code op en navigeer naar shared scherm
    setShareCode(shareCode);
    setScreen('shared');
  }
}, []);
```

De `'shared'` case in de switch rendert `<SharedPlayer code={shareCode} />`.

### Stap 8: gameStore aanpassen

`GameScreen` type uitbreiden:

```typescript
// Huidige screens:
'start' | 'map' | 'location' | 'studio' | 'stage' | 'compositions' | 'teacher'

// Nieuw:
'start' | 'map' | 'location' | 'studio' | 'stage' | 'compositions' | 'teacher' | 'shared'
```

Nieuwe state: `shareCode: string | null` in gameStore.

### Stap 9: Vertalingen

**Nederlands (`nl.json`):**
```json
{
  "share": {
    "shareLink": "Deel link",
    "generating": "Link wordt aangemaakt...",
    "linkReady": "Je link is klaar!",
    "copyLink": "Kopieer link",
    "copied": "Gekopieerd!",
    "expiresIn": "Link verloopt na 30 dagen",
    "code": "Code",
    "codeDescription": "Of deel deze code — de ontvanger kan deze invoeren op het startscherm",
    "expired": "Deze link is verlopen",
    "notFound": "Compositie niet gevonden",
    "loading": "Compositie laden...",
    "listenTitle": "Heb je een code?",
    "listenPlaceholder": "Voer code in",
    "listen": "Beluister",
    "invalidCode": "Voer een geldige 8-karakter code in",
    "backToStart": "Terug naar SoundScout",
    "viewCount": "{{count}}x beluisterd",
    "by": "Door"
  }
}
```

**Engels (`en.json`):**
```json
{
  "share": {
    "shareLink": "Share link",
    "generating": "Creating link...",
    "linkReady": "Your link is ready!",
    "copyLink": "Copy link",
    "copied": "Copied!",
    "expiresIn": "Link expires in 30 days",
    "code": "Code",
    "codeDescription": "Or share this code — the recipient can enter it on the start screen",
    "expired": "This link has expired",
    "notFound": "Composition not found",
    "loading": "Loading composition...",
    "listenTitle": "Got a code?",
    "listenPlaceholder": "Enter code",
    "listen": "Listen",
    "invalidCode": "Enter a valid 8-character code",
    "backToStart": "Back to SoundScout",
    "viewCount": "Listened {{count}} times",
    "by": "By"
  }
}
```

---

## Implementatievolgorde

| Stap | Wat | Geschatte tijd |
|------|-----|---------------|
| 1 | Database migratie (SQL in Supabase) | 15 min |
| 2 | `src/lib/submissions.ts` uitbreiden | 15 min |
| 3 | `ShareLinkModal.tsx` bouwen | 45 min |
| 4 | `StageView.tsx` aanpassen (knop + modal) | 15 min |
| 5 | `SharedPlayer.tsx` bouwen (hergebruik SubmissionPlayer) | 60 min |
| 6 | `ShareCodeInput.tsx` bouwen | 30 min |
| 7 | `App.tsx` + `gameStore.ts` aanpassen | 20 min |
| 8 | `StartScreen.tsx` aanpassen | 20 min |
| 9 | Vertalingen (NL + EN) | 10 min |
| 10 | Testen + bugfixes | 30 min |
| **Totaal** | | **~4 uur** |

---

## Impact op bestaande code

### Geen breaking changes

- Bestaande submissions behouden hun `class_id` — niets verandert
- Bestaande docent-queries filteren op `class_id` en werken ongewijzigd
- Bestaande "Deel met docent" flow is ongewijzigd
- RLS policies voor docenten zijn ongewijzigd

### Kleine aanpassingen nodig

- `useSubmissions.ts` query: moet mogelijk `class_id IS NOT NULL` filter toevoegen als de SET NULL gedrag submissions zonder klas zichtbaar maakt voor de docent. In praktijk is dit al afgedekt door de RLS policy die checkt op `classes.teacher_id = auth.uid()` — als `class_id = NULL` is er geen match, dus de docent ziet het niet.

### Aandachtspunt: teacher dashboard

Na de SET NULL wijziging: als een docent een klas wist, worden submissions niet verwijderd maar krijgen ze `class_id = NULL`. De bestaande RLS policy (`EXISTS (SELECT 1 FROM classes WHERE classes.id = submissions.class_id AND classes.teacher_id = auth.uid())`) filtert deze automatisch uit — `class_id = NULL` matcht geen klas. Dus het teacher dashboard werkt correct zonder aanpassingen.

---

## Toekomstige uitbreidingen (niet in scope)

- **"Verder werken" vanaf gedeelde link (#35)** — compositiedata laden in de volledige editor
- **Docent-submissions ook een share_code geven** — zodat docent de link naar ouders kan sturen
- **Verlengbare links** — optie om verloopdatum te verlengen
- **Automatische cleanup** — cron-job om verlopen rijen te verwijderen (voor opslagruimte)

---

## Checklist voor implementatie

- [ ] SQL migratie uitvoeren in Supabase SQL Editor
- [ ] Testen: bestaande submissions nog zichtbaar in teacher dashboard
- [ ] Testen: nieuwe publieke share aanmaken (zonder class_id)
- [ ] Testen: ophalen via share code
- [ ] Testen: verlopen link geeft leeg resultaat
- [ ] Frontend bouwen (stap 2-9)
- [ ] Testen: volledige flow leerling → deel link → ontvanger opent
- [ ] Testen: code invoeren op startscherm
- [ ] Testen: klas wissen → submissions met share_code blijven werken
- [ ] schema.sql bijwerken met nieuwe kolommen en functies
- [ ] TODO-IMPLEMENTATIE.md bijwerken
- [ ] CLAUDE.md bijwerken
