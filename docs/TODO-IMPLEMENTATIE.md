# SoundScout - Implementatie Todo's

**Laatst bijgewerkt**: 2026-02-27 (Architectuur verbeterpunten + educatieve features)
**Gebaseerd op**: PRD Fase 4 & 5, gebruiker feedback, architectuur analyse rapport (2026-02-27)

---

## Prioriteiten Legenda

| Prio | Betekenis |
|------|-----------|
| 🔴 P1 | Hoogste prioriteit - nu aanpakken |
| 🟠 P2 | Hoge prioriteit - snel na P1 |
| 🟡 P3 | Medium prioriteit |
| 🟢 P4 | Lage prioriteit - later |
| ⚪ P5 | Zeer lage prioriteit / parkeren |
| ❌ | Verwijderd / niet implementeren |

---

## ✅ VOLTOOID

### 1. Nieuwe Locaties & Stadskaart (5.1) ✅
**Status:** VOLTOOID

- [x] Stadskaart/hub als nieuw scherm (`'map'` screen)
- [x] Elk locatie eigen kleurenpalet en sfeer
- [x] Theme systeem met URL parameter (`?theme=basis`)
- [x] Boerderij locatie (6 samples)
- [x] Speeltuin locatie (6 samples)
- [x] Gymzaal locatie (6 samples)
- [x] Muziekwinkel locatie (6 samples)
- [x] Voortgangsindicator per locatie (verzameld/totaal badge)

### 2. Audio Export als MP3 (4.5) ✅
**Status:** VOLTOOID

- [x] "Download als MP3" knop in Club-scherm
- [x] Tone.js Offline rendering implementeren
- [x] Converteren naar MP3 (@breezystack/lamejs)
- [x] Bestandsnaam: `{compositie-naam}.mp3`
- [x] Progress indicator tijdens export
- [x] Error handling en success feedback

### 3. Lokaal Opslaan & Beheren (4.1, 4.2) ✅
**Status:** VOLTOOID

- [x] "Opslaan" knop in Club-scherm
- [x] Compositie naam invoer
- [x] Automatische metadata: datum, duur, aantal tracks
- [x] "Mijn Composities" scherm
- [x] Acties: Openen, Afspelen, Verwijderen
- [x] Re-save bestaande compositie (update i.p.v. nieuwe)
- [x] Waarschuwing over lokale opslag

### 4. Responsive Design ✅
**Status:** VOLTOOID (2026-02-01)

- [x] Touch feedback (active states) op alle buttons
- [x] Hover-afhankelijke acties altijd zichtbaar op mobile
- [x] Responsive scaling alle componenten (sm: breakpoint)
- [x] LocationMarker: 20×20px op mobile, labels verborgen
- [x] SampleLibrary: compacte weergave op mobile
- [x] RecorderBar: responsive slots
- [x] TransportControls: kleinere buttons op mobile
- [x] Minimum touch targets (44px)
- [x] 16:9 canvas containers voor LocationScene en MapView

### 5. Studio Layout ✅
**Status:** VOLTOOID

- [x] 8 tracks (was 4)
- [x] Timeline onderaan (boven transport controls)
- [x] Library met flex-wrap (geen horizontal scroll)

### 6. Nieuwe Locaties Assets ✅
**Status:** VOLTOOID (2026-02-01)

- [x] Boerderij: achtergrond + 6 samples
- [x] Speeltuin: achtergrond + 6 samples
- [x] Gymzaal: achtergrond + 6 samples
- [x] Muziekwinkel: achtergrond + 6 samples
- [x] Alle locaties geconfigureerd via Locatie Editor exports

### 7. Design System & Styling ✅
**Status:** VOLTOOID (2026-02-02)

- [x] 60-30-10 kleurregel geïmplementeerd
- [x] Neutral colors (60%): bg-app, bg-surface, text colors
- [x] Brand colors (30%): slate palette (#0f172a) voor headers
- [x] Accent colors (10%): amber palette voor CTAs/buttons
- [x] "Club" hernoemd naar "Stage" in hele app
- [x] Stage lights achtergrond met gradient animaties
- [x] CSS design tokens georganiseerd in index.css

### 8. Teacher Dashboard Verbeteringen ✅
**Status:** VOLTOOID (2026-02-02)

- [x] Read-only timeline viewer voor docent compositie review
- [x] Fullscreen modal in SubmissionPlayer
- [x] Playhead tracking met stabiele setInterval (~30fps)
- [x] Custom samples lookup voor submission data
- [x] Play/Pause/Stop controls in viewer

### 9. StartScreen Branding ✅
**Status:** VOLTOOID (2026-02-02)

- [x] SoundScout logo boven titel
- [x] Logo als favicon (SVG + PNG + Apple touch)
- [x] Logo kleur aangepast naar brand blue (#0f172a)
- [x] Footer met social media links (Instagram, Facebook, LinkedIn, YouTube)
- [x] "Gemaakt door Bert van Uffelen" credit
- [x] "Over deze app" modal met workshop informatie
- [x] Wit logo voor mobile dark mode (2026-02-03)

### 10. Klas-code Systeem (4.4) ✅
**Status:** VOLTOOID (2026-02-03)
**Documentatie:** `docs/PLAN-KLASCODE-SYSTEEM.md`

**Backend & Database:**
- [x] Supabase project opzetten
- [x] Database schema (teachers, classes, submissions tabellen)
- [x] RLS policies voor beveiliging
- [x] `generate_class_code` database functie (4-cijferig)
- [x] Max classes limiet per docent (default: 8, NULL = onbeperkt)

**Docent Features:**
- [x] Registratie met email/wachtwoord (`TeacherRegister.tsx`)
- [x] Login met email/wachtwoord (`TeacherLogin.tsx`)
- [x] Wachtwoord vergeten flow
- [x] AuthContext met useAuth hook
- [x] Klassen aanmaken met automatische code (`useClasses.ts`)
- [x] Klassen overzicht in dashboard (`TeacherDashboard.tsx`)
- [x] Klassen verwijderen met bevestiging
- [x] Composities per klas bekijken (`ClassDetail.tsx`)
- [x] Composities afspelen met timeline (`SubmissionPlayer.tsx`)
- [x] Composities verwijderen (`useSubmissions.ts`)

**Leerling Features:**
- [x] "Deel met docent" modal (`ShareWithTeacherModal.tsx`)
- [x] 3-stap flow: code → validatie → verzenden
- [x] Grappige random namen (`randomNames.ts`, 1050+ combinaties)
- [x] Optionele eigen naam invoer

**Security (2026-02-03):**
- [x] RLS policies op classes tabel
- [x] Code-level filtering op teacher_id
- [x] Docenten zien alleen eigen klassen

### 11. Hotspot Animaties (5.3) ✅
**Status:** VOLTOOID (2026-02-03)

- [x] Idle animatie: `hotspot-pulse` (scale 1→1.1, 2s ease-in-out infinite)
- [x] Hover animatie: `hotspot-pulse-hover` (scale 1.5→1.65)
- [x] Active animatie: scale 1.3 met animation: none bij click
- [x] Collected state: Hotspot verdwijnt volledig (geen fade, direct hidden)

**Locatie:** `src/index.css` (regels 192-213), `src/components/location/Hotspot.tsx`

**Notitie:** Collected fade-out animatie is optioneel - huidige implementatie verbergt hotspot direct wat duidelijker is voor gebruikers.

### 12. Clip Trimming & Smart Snap (#12 + #16) ✅
**Status:** VOLTOOID (2026-02-03)
**Roadmap:** `docs/ROADMAP-CLIP-TRIMMING.md`
**Complexiteit:** ⭐⭐⭐⭐ Hoog (12-16 uur, 7 fases)

Volledig geïmplementeerde feature set voor clip trimming en smart snap:

**Fase 1: Type Extensies** ✅
- [x] Clip type uitgebreid met `trimStart` en `trimEnd` (seconden)
- [x] Constants: `MIN_TRIM_DURATION_SECONDS`, `WAVEFORM_PEAK_COUNT`
- [x] Helper functies: `getClipDuration`, `getClipDurationBeats`, `getClipEndBeat`

**Fase 2: Smart Snap & Overlap Detectie** ✅
- [x] `clipCollision.ts` met `getClipBounds`, `boundsOverlap`, `wouldOverlap`
- [x] `findSmartSnapPosition()` algoritme (original → shifted → track_below → rejected)
- [x] `timelineStore.addClip()` en `moveClip()` gebruiken smart snap

**Fase 3: Clip Selection State** ✅
- [x] `selectionStore.ts` met `selectedClipId`, `selectedTrackIndex`
- [x] Clip component met selection highlight (ring)
- [x] Click-away to deselect op Track en Timeline

**Fase 4: Edit Toolbar Component** ✅
- [x] `EditToolbar.tsx` met sample info, trim/delete buttons
- [x] Geïntegreerd in StudioView boven timeline
- [x] Translations (nl + en)

**Fase 5: Waveform Generatie** ✅
- [x] `waveform.ts` met `extractWaveformPeaks()`, `createWaveformData()`
- [x] `AudioService.getWaveform()` met caching
- [x] `AudioService.playSampleRegion()` voor preview
- [x] `Waveform.tsx` canvas component met trim region highlighting

**Fase 6: Trim Modal** ✅
- [x] `TrimModal.tsx` met waveform visualisatie
- [x] Drag handles voor trim start/end
- [x] Preview playback, Apply/Cancel/Reset
- [x] Geïntegreerd in StudioView

**Fase 7: Audio Scheduling met Trim** ✅
- [x] `scheduleTimeline()` gebruikt `player.start(time, trimStart, trimDuration)`
- [x] Clip visuele breedte reflecteert getrimde duration
- [x] StorageService `computeMetadata()` respecteert trim

**Bug fixes:**
- [x] Toolbar deselect: Track component cleared selection on click
- [x] Trim handle: clamp() fix voor rechter handle bij ongetrimde samples

**Nieuwe bestanden:**
- `src/utils/clipCollision.ts`
- `src/utils/waveform.ts`
- `src/stores/selectionStore.ts`
- `src/components/studio/EditToolbar.tsx`
- `src/components/studio/Waveform.tsx`
- `src/components/studio/TrimModal.tsx`

### 13. Audio Loading Robuuster (#15) ✅
**Status:** VOLTOOID (2026-02-03)
**Complexiteit:** ⭐⭐ Medium
**Bron:** Docent feedback groep 6 - "Niet alle geluiden werkten bij iedereen"

**Geïmplementeerd:**
- [x] Parallel loading met concurrency limiet (3 tegelijk)
- [x] Retry mechanisme met exponential backoff (1s, 2s)
- [x] Timeout bescherming (15 seconden per sample)
- [x] Progress bar met percentage in LocationScene
- [x] "Opnieuw proberen" knop bij fouten
- [x] Error feedback in gebruikersvriendelijke taal

**Nieuwe constants (`config.ts`):**
```typescript
AUDIO_LOAD_TIMEOUT_MS = 15000
AUDIO_LOAD_MAX_RETRIES = 2
AUDIO_LOAD_CONCURRENCY = 3
```

**Gewijzigde bestanden:**
- `src/constants/config.ts` - Nieuwe audio loading constants
- `src/services/AudioService.ts` - Parallel loading + retry + timeout
- `src/hooks/useAudioEngine.ts` - onProgress callback
- `src/hooks/useLocationAudio.ts` - Progress/error/retry state
- `src/components/location/LocationScene.tsx` - Progress bar + retry UI
- `src/i18n/locales/{nl,en}.json` - Nieuwe i18n keys

### 14. Ambient Audio (#18) ✅
**Status:** VOLTOOID (2026-02-03)
**Complexiteit:** ⭐⭐ Medium
**Notitie:** Feature werkt, maar nog niet gekoppeld aan bestaande thema's

**Geïmplementeerd:**
- [x] Ambient audio methods in AudioService
- [x] Looping playback met `Tone.Player`
- [x] Zachter volume dan samples (-15dB)
- [x] Fade in/out bij scene transitions (1.5s)
- [x] Optioneel per locatie (`ambientAudio: ''` = uit)
- [x] Geïntegreerd in useLocationAudio hook

**Hoe ambient audio toe te voegen:**
```typescript
// In locations.ts van een thema:
{
  id: 'boerderij',
  ambientAudio: '/audio/themes/basis/ambient/boerderij.mp3', // ← Pad naar MP3
  // ...rest
}
```

**Gewijzigde bestanden:**
- `src/constants/config.ts` - AMBIENT_AUDIO_VOLUME_DB, AMBIENT_AUDIO_FADE_SECONDS
- `src/services/AudioService.ts` - loadAmbient, playAmbient, stopAmbient, setAmbientVolume
- `src/hooks/useAudioEngine.ts` - Ambient audio methods
- `src/hooks/useLocationAudio.ts` - ambientUrl prop

**Huidige status:** Alle locaties hebben `ambientAudio: ''` - feature klaar voor gebruik.

### 15. Drag Offset Alignment (#16) ✅
**Status:** VOLTOOID (2026-02-04)
**Complexiteit:** ⭐⭐ Medium
**Bron:** Docent feedback (2026-02-03) - leerlingen verward door visuele mismatch
**Roadmap:** `docs/ROADMAP-DRAG-OFFSET.md`

### 16. Playhead Seeking (#17) ✅
**Status:** VOLTOOID (2026-02-04)
**Complexiteit:** ⭐⭐⭐ Medium-Hoog
**Roadmap:** `docs/ROADMAP-PLAYHEAD-SEEKING.md`
**Kennisbank:** `docs/TONEJS-KENNISBANK.md`

**Probleem:**
- Playhead (rode lijn) was niet zichtbaar wanneer niet aan het afspelen
- Playhead kon niet worden versleept naar een andere positie
- Audio startte altijd vanaf beat 0, niet vanaf seek positie
- Bij seek naar midden van een clip speelde de clip niet (kritieke bug)

**Oplossing (Hybride Aanpak):**

**Fase 1-7: Basis Tone.Part implementatie**
- [x] `timelinePart` property in AudioService
- [x] `scheduleTimeline()` refactored naar Tone.Part
- [x] `play(fromBeat)` met transport offset
- [x] `seek(beat)` methode
- [x] Playhead component met ruler strip (16px)
- [x] Draggable playhead handle met 44px touch hitbox

**Fase 8a-8f: Hybride aanpak voor actieve clips**
- [x] `scheduledTracks` en `scheduledSamples` opslaan
- [x] `isClipActiveAtBeat()` helper
- [x] `getActiveClipsAtBeat()` met berekende parameters
- [x] `startActiveClips()` methode
- [x] Integratie in `play()` - actieve clips direct starten
- [x] `dispose()` cleanup

**Kern van de oplossing:**
```typescript
play(fromBeat: number = 0): void {
  // STAP 1: Start clips die al actief zijn (direct)
  if (fromBeat > 0) {
    this.startActiveClips(fromBeat);
  }

  // STAP 2: Start transport voor toekomstige clips (via Tone.Part)
  transport.start('+0.05', offsetSeconds);
}
```

**Kritieke ontdekking:**
Tone.Part + `transport.start(time, offset)` overslaat events die vóór de offset liggen.
Clips die al begonnen zijn maar nog actief zijn moeten DIRECT worden gestart met aangepaste `trimStart` en `duration`.

**Gewijzigde bestanden:**
- `src/services/AudioService.ts` - Hybride seek aanpak
- `src/hooks/useAudioEngine.ts` - `playTimeline(fromBeat)`
- `src/hooks/useStudioPlayback.ts` - `currentBeat` integratie
- `src/components/studio/Timeline.tsx` - Ruler strip
- `src/components/studio/Playhead.tsx` - Nieuw component
- `src/components/studio/StudioView.tsx` - Playhead integratie

**Documentatie:**
- `docs/ROADMAP-PLAYHEAD-SEEKING.md` - Volledige implementatie roadmap
- `docs/TONEJS-KENNISBANK.md` - Sectie 8: Kritieke uitleg van het probleem

**Probleem:**
Bij het slepen van een sample/clip naar de timeline waren er meerdere visuele elementen zichtbaar:
1. **Originele clip** (met opacity-30 en transform)
2. **DragOverlay** (volgt cursor op grip-punt)
3. **Snap Preview** (gestippeld, toont daadwerkelijke drop positie)

Dit veroorzaakte verwarring bij leerlingen. Extra probleem: als je een clip in het midden aanklikt, sprong de snap preview naar de cursor positie i.p.v. de originele positie van de clip.

**Oplossing (twee-delige aanpak):**

**Deel 1: Eén visueel element**
- DragOverlay verbergen wanneer snapPreview actief is
- Originele clip volledig onzichtbaar (opacity-0) tijdens slepen
- Resultaat: alleen de snap preview is zichtbaar boven tracks

**Deel 2: Delta-based clip repositioning**
- Nieuwe refs voor het onthouden van originele clip positie
- Samples uit library: cursor-based berekening (cursor = linkerrand preview)
- Clips verplaatsen: delta-based berekening (originele positie + delta)
- Belangrijke fix: waarden opslaan in lokale variabelen VOORDAT refs worden gereset

**Geïmplementeerd:**
- [x] DragOverlay verborgen wanneer `snapPreview` bestaat (StudioView.tsx)
- [x] Originele clip `opacity-0` tijdens isDragging (Clip.tsx)
- [x] `originalClipStartBeatRef` en `activeDragTypeRef` refs (useStudioDnD.ts)
- [x] `calculateClipDropBeat()` functie voor delta-based berekening
- [x] Waarden opslaan vóór ref reset in handleDragEnd
- [x] Build & lint verificatie succesvol

**Code snippets:**

```typescript
// useStudioDnD.ts - Nieuwe refs
const originalClipStartBeatRef = useRef<number | null>(null);
const activeDragTypeRef = useRef<'sample' | 'clip' | null>(null);

// handleDragStart - Originele positie opslaan
if (dragType === 'clip') {
  const clip = event.active.data.current?.clip as Clip | undefined;
  originalClipStartBeatRef.current = clip?.startBeat ?? null;
}

// handleDragMove/handleDragEnd - Kies juiste berekening
const beat =
  activeDragTypeRef.current === 'clip'
    ? calculateClipDropBeat(over, delta)    // Delta-based voor clips
    : calculateDropBeat(over, activatorEvent, delta);  // Cursor-based voor samples

// handleDragEnd - KRITIEK: waarden opslaan VOOR reset
const currentDragType = activeDragTypeRef.current;
const originalClipStartBeat = originalClipStartBeatRef.current; // Eerst opslaan!
// ... dan pas refs resetten ...
```

**Gewijzigde bestanden:**
- `src/hooks/useStudioDnD.ts` - Nieuwe refs, calculateClipDropBeat, delta-based logica
- `src/components/studio/StudioView.tsx` - DragOverlay verbergen bij snapPreview
- `src/components/studio/Clip.tsx` - opacity-0 bij isDragging

**Resultaat:**
| Scenario | Gedrag |
|----------|--------|
| Sample uit library slepen | Cursor = linkerrand snap preview |
| Clip verplaatsen | Originele positie + delta = snap preview |
| Boven track | Alleen snap preview zichtbaar |
| Niet boven track | Alleen DragOverlay zichtbaar |

---

## 🛠️ TECHNISCHE SCHULD & ARCHITECTUUR VERBETERINGEN

**Bron:** Uitgebreid architectuur analyserapport (2026-02-27) — twee analyses gecombineerd
**Overall score:** 5.3/10 — "Functioneel maar onvolwassen voor productie"
**Doel:** Technische basis versterken vóórdat nieuwe educatieve features (#21, #39, #40, #41) worden gebouwd

### Overzicht Scores per Domein

| Domein | Score | Status |
|--------|-------|--------|
| State Management (Zustand) | 7.0/10 | Solide basis, verbeterpunten |
| Component Architectuur | 7.1/10 | Goed, enkele god-components |
| Services & Hooks | 6.5/10 | Riskant: singleton, error handling |
| Type Systeem & Data | 5.5/10 | Kritiek: `any` types, geen validatie |
| Security | 6.5/10 | Goede basis, gaps in rate limiting |
| Testing | 2.0/10 | Vrijwel afwezig |
| UX/UI (kindvriendelijkheid) | 6.5/10 | Goede flows, ontbrekende error prevention |
| Accessibility (WCAG 2.1 AA) | 3.5/10 | Kritiek: keyboard, screen reader, DnD |
| Performance | 5.0/10 | Geen code splitting, 20Hz re-renders |
| SEO & Deployment | 2.5/10 | Geen meta tags, geen PWA, geen caching |

---

### TP0 - KRITIEK (veiligheid & data-integriteit) ✅ VOLTOOID

> **Deze items MOETEN worden opgepakt vóór nieuwe features.**
> Geschatte totale effort: **1-2 dagen**

#### TP0-1. Vervang `any` types door `CompositionData` interface ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (2-3 uur)
**Impact:** Data safety — voorkomt runtime crashes door ongetypeerde data

**Probleem:**
Het meest kritieke datatype (composities) is overal `any`:

| Bestand | Lijn | Type |
|---------|------|------|
| `src/hooks/useSubmissions.ts` | 15 | `composition_data: any` |
| `src/lib/submissions.ts` | 17, 96, 102 | `compositionData: any` |
| `src/components/share/ShareWithTeacherModal.tsx` | 18 | `compositionData: any` |
| `src/components/share/SharedPlayer.tsx` | 200, 202 | `(t: any)` filter |
| `src/components/share/ShareLinkModal.tsx` | 19 | `compositionData: any` |
| `src/components/teacher/SubmissionPlayer.tsx` | 52, 54 | `(t: any)` filter |
| `src/hooks/useClasses.ts` | 84 | `(c: any)` map casting |

**Oplossing:**
```typescript
// src/types/index.ts — Nieuw type
interface CompositionData {
  tracks: Track[];
  bpm: number;
  totalBeats: number;
  name: string;
  themeId: string;
}
```
Vervang alle `any` door `CompositionData` in bovenstaande bestanden.

**Waarom nu:** Templates (#21) en Volume per Track (#39) breiden het compositie-datamodel uit. Zonder sterk type worden fouten pas in de UI ontdekt.

#### TP0-2. Rate limiting op anonieme submissions ✅
**Status:** Voltooid (2026-02-27) — SQL functie + frontend error handling
**Effort:** Klein-Medium (3-4 uur)
**Impact:** DoS preventie — voorkomt spam naar klas-submissions

**Probleem:**
```sql
-- Huidige policy: volledig open!
CREATE POLICY "Anyone can submit compositions"
  ON public.submissions FOR INSERT
  WITH CHECK (TRUE);
```
Iedereen kan onbeperkt composities indienen naar elke klas.

**Oplossing:**
Rate limit via Supabase RPC functie (max 50 submissions per klas per uur):
```sql
CREATE OR REPLACE FUNCTION submit_composition_rate_limited(
  p_class_id UUID,
  p_student_name TEXT,
  p_composition_name TEXT,
  p_composition_data JSONB
) RETURNS UUID AS $$
DECLARE
  recent_count INT;
  new_id UUID;
BEGIN
  -- Check rate limit: max 50 per class per hour
  SELECT COUNT(*) INTO recent_count
  FROM submissions
  WHERE class_id = p_class_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 50 THEN
    RAISE EXCEPTION 'Rate limit exceeded for this class';
  END IF;

  INSERT INTO submissions (class_id, student_name, composition_name, composition_data)
  VALUES (p_class_id, p_student_name, p_composition_name, p_composition_data)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Waarom nu:** Zodra de app in meer scholen wordt gebruikt, is dit een reëel risico.

#### TP0-3. CHECK constraints op Supabase tabellen ✅
**Status:** Voltooid (2026-02-27) — SQL constraints gedocumenteerd, handmatig toe te passen
**Effort:** Klein (1-2 uur)
**Impact:** Data validatie — voorkomt corrupte/oversized data

**Probleem:** Geen validatie op grootte of structuur van data in Supabase.

**Oplossing:**
```sql
-- Compositie data grootte limiet (1MB max)
ALTER TABLE public.submissions
ADD CONSTRAINT valid_composition_size
CHECK (octet_length(composition_data::text) <= 1048576);

-- Minimale/maximale lengte op tekstvelden
ALTER TABLE public.submissions
ADD CONSTRAINT valid_student_name
CHECK (char_length(student_name) BETWEEN 1 AND 100);

ALTER TABLE public.submissions
ADD CONSTRAINT valid_composition_name
CHECK (char_length(composition_name) BETWEEN 1 AND 200);

-- Classes tabel
ALTER TABLE public.classes
ADD CONSTRAINT valid_class_name
CHECK (char_length(name) BETWEEN 1 AND 100);
```

#### TP0-4. max_classes afdwinging in database ✅
**Status:** Voltooid (2026-02-27) — Code-level + SQL trigger gedocumenteerd
**Effort:** Klein (1 uur)
**Impact:** Business rule enforcement — nu alleen in code, niet in DB

**Probleem:** CLAUDE.md vermeldt max 8 klassen per docent, maar er is geen constraint in het schema. Code-level check kan worden omzeild.

**Oplossing:**
```sql
-- Trigger functie voor max classes enforcement
CREATE OR REPLACE FUNCTION check_max_classes()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM classes WHERE teacher_id = NEW.teacher_id;

  SELECT COALESCE(max_classes, 8) INTO max_allowed
  FROM teachers WHERE id = NEW.teacher_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Maximum number of classes (%) reached', max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_classes
  BEFORE INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION check_max_classes();
```

---

### TP1 - HOOG (architectuur stabiliteit) ✅ VOLTOOID

> **Deze items versterken de basis voor de nieuwe features.**
> Geschatte totale effort: **2-3 dagen**

#### TP1-1. Split StageView.tsx (god-component, 506 regels) ✅
**Status:** Voltooid (2026-02-27) — StagePlayback.tsx, useStageSave.ts, useStageModals.ts
**Effort:** Medium (4-6 uur)
**Impact:** Onderhoudbaarheid — 7 useState hooks, 3 modals, complexe save flow

**Probleem:**
StageView combineert: playback UI, save logica, export logica, share modals. Te veel verantwoordelijkheden in één component.

**Oplossing — split in drie:**
```
StageView.tsx (nu 506 regels) →
├── StageView.tsx (~150 regels) — layout + orkestratie
├── StagePlayback.tsx (~120 regels) — playback UI only
├── useStageModals.ts (~60 regels) — modal state management
└── useStageSave.ts (~80 regels) — save/warning logica
```

**Waarom nu:** StageView groeit met elke feature (share link, export, etc.). Zonder split wordt elke toevoeging moeilijker.

#### TP1-2. Fix ambient audio fade timeout leak ✅
**Status:** Voltooid (2026-02-27) — ambientFadeTimeout tracking + cleanup in dispose()
**Effort:** Klein (30 min)
**Impact:** Resource management — timeout kan lekken bij unmount

**Probleem:** `setTimeout` handle in `AudioService.stopAmbient()` (lijn 683-689) wordt niet bijgehouden.

**Oplossing:**
```typescript
private ambientFadeTimeout: ReturnType<typeof setTimeout> | null = null;

stopAmbient(fade = true): void {
  if (this.ambientFadeTimeout) {
    clearTimeout(this.ambientFadeTimeout);
    this.ambientFadeTimeout = null;
  }
  if (fade) {
    this.ambientFadeTimeout = setTimeout(() => {
      this.ambientPlayer?.stop();
      this.ambientFadeTimeout = null;
    }, AMBIENT_AUDIO_FADE_SECONDS * 1000);
  }
}

dispose(): void {
  if (this.ambientFadeTimeout) clearTimeout(this.ambientFadeTimeout);
  // ... rest van cleanup
}
```

#### TP1-3. Error handling op async hooks ✅
**Status:** Voltooid (2026-02-27) — try-catch + error state in useAudioEngine, useClasses, useSubmissions
**Effort:** Medium (3-4 uur)
**Impact:** Crash preventie — async operaties missen try-catch

**Probleem:**
`useAudioEngine`, `useClasses`, `useSubmissions` hebben incomplete error handling. Gefaalde async operaties kunnen leiden tot inconsistente UI state.

**Te doen:**
- [ ] `useAudioEngine.ts` — try-catch rond `loadSamples()`, `playSample()`
- [ ] `useClasses.ts` — error state + type safety (verwijder `any` casts)
- [ ] `useSubmissions.ts` — error state + type safety
- [ ] Gebruikersvriendelijke foutmeldingen bij network errors

#### TP1-4. Feature-level Error Boundaries ✅
**Status:** Voltooid (2026-02-27) — FeatureErrorBoundary component rond alle schermen in App.tsx
**Effort:** Klein (2-3 uur)
**Impact:** Gebruikerservaring — nu crasht de hele app bij een fout in één onderdeel

**Probleem:**
Alleen root-level ErrorBoundary. Als Studio crasht, is de hele app weg.

**Oplossing:**
Voeg ErrorBoundary wrappers toe rond:
- [ ] StudioView (meest complexe component)
- [ ] StageView (export/save kan falen)
- [ ] MapView (theme loading kan falen)
- [ ] TeacherDashboard (Supabase calls)

Gebruik bestaand `ErrorBoundary` component met fallback UI per feature.

#### TP1-5. Orchestratie-functie voor compositie-initialisatie ✅
**Status:** Voltooid (2026-02-27) — initializeNewComposition() in src/utils/compositionInit.ts
**Effort:** Klein (1-2 uur)
**Impact:** State consistentie — nu 5 losse store-calls zonder error recovery

**Probleem:**
```typescript
// StartScreen.tsx — huidige flow:
setTheme(id)        // themeStore
clearAllTracks()    // timelineStore
clearLibrary()      // libraryStore
await initAudio()   // audioService (async!)
goToMap()           // appStore
// Als initAudio faalt: thema is al gezet, tracks zijn al gewist
```

**Oplossing:**
```typescript
// Nieuwe functie in een utility of hook
async function initializeNewComposition(themeId: string): Promise<boolean> {
  try {
    useThemeStore.getState().setTheme(themeId);
    useTimelineStore.getState().clearAllTracks();
    useLibraryStore.getState().clearLibrary();
    await audioService.init();
    useAppStore.getState().goToMap();
    return true;
  } catch (error) {
    // Rollback: ga terug naar start, toon foutmelding
    useAppStore.getState().goToStart();
    logger.error('Failed to initialize composition:', error);
    return false;
  }
}
```

**Waarom nu:** Templates (#21) voegen een tweede initialisatie-flow toe. Zonder orchestratie krijg je dubbele logica.

---

### TP2 - MEDIUM (code kwaliteit) ✅ VOLTOOID

> **Deze items verbeteren de developer experience en voorkomen bugs.**
> Geschatte totale effort: **2-3 dagen**

#### TP2-1. Voltooi gameStore → appStore migratie ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1 uur)

- [x] `gameStore.ts` verwijderd
- [x] Alle `useGameStore` imports vervangen door `useAppStore`
- [x] CLAUDE.md bijgewerkt

#### TP2-2. Verwijder libraryStore redundante state ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1 uur)

- [x] `collectedSampleIds` array verwijderd
- [x] Computed getter `getCollectedSampleIds()` toegevoegd
- [x] Alle consumers bijgewerkt

#### TP2-3. Error context voor SmartSnapResult ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (30 min)

- [x] `SmartSnapResult` uitgebreid met `rejectReason: 'no_space' | 'invalid_track' | 'out_of_bounds'`
- [x] Discriminated union type: success (`reason: 'original' | 'snapped'`) vs rejected

#### TP2-4. Extraheer usePanZoom() uit ZoomableView ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Medium (2-3 uur)

- [x] `src/hooks/usePanZoom.ts` aangemaakt met alle pan/zoom logica
- [x] ZoomableView gereduceerd van 352 naar ~191 regels (render-only)

#### TP2-5. Extraheer useStudioKeyboardShortcuts() ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1 uur)

- [x] `src/hooks/useStudioKeyboardShortcuts.ts` aangemaakt
- [x] Keyboard shortcuts (Space, Ctrl+D) uit StudioView useEffect verplaatst

#### TP2-6. timelineStore parameter bloat reduceren ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Medium (2-3 uur)

- [x] Store haalt samples intern op via `useLibraryStore.getState()`
- [x] `addClip(trackIndex, clip)` — van 6 naar 2 params
- [x] `moveClip(from, to, clipId, beat)` — van 6 naar 4 params
- [x] `duplicateClip(trackIndex, clipId)` — van 5 naar 2 params
- [x] Alle callers bijgewerkt (StudioView, useStudioDnD)

#### TP2-7. Voeg data validatie toe met zod ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Medium (3-4 uur)

- [x] `src/utils/schemas.ts` aangemaakt met alle zod schemas
- [x] Schemas: ClipSchema, TrackSchema, SampleSchema, CompositionDataSchema, SavedCompositionSchema, UserPreferencesSchema, LibraryStateSchema
- [x] Parse helpers: `parseCompositionData()`, `parseSavedCompositions()`, `parseUserPreferences()`, `parseLibraryState()`
- [x] StorageService gebruikt nu zod validatie bij alle reads
- [x] `isValidCompositionData()` herschreven met zod schema
- [x] 53 unit tests voor alle schemas

---

### TP3 - LAAG (optimalisatie & developer experience) ✅ GROTENDEELS VOLTOOID

> **Nice-to-haves die de codebase schoner maken.**
> Geschatte totale effort: **2-3 dagen**

#### TP3-1. Memoized selectors voor timelineStore ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1 uur)

- [x] `selectHasClips()`, `selectClipCount()`, `selectHasNoClips()` toegevoegd aan timelineStore
- [x] StudioView en Timeline gebruiken nu store selectors i.p.v. inline berekeningen

#### TP3-2. Player cache opschoning (memory leak) ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1-2 uur)

- [x] `disposeUnusedPlayers(activeSampleIds)` methode toegevoegd aan AudioService
- [x] Aangeroepen bij theme-wissel via `compositionInit.ts` (stap 2b)
- [x] Waveform cache wordt mee opgeschoond

#### TP3-3. StorageService faal-feedback ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1 uur)

- [x] `private set<T>()` retourneert nu `boolean`
- [x] Alle publieke write methoden retourneren success/failure
- [x] `useStageSave` en `CompositionsView` tonen foutmelding bij mislukte save

#### TP3-4. Alfanumerieke klas-codes
**Status:** Geparkeerd (P3) — vereist Supabase database-migratie
**Effort:** Klein (1 uur code + database migratie)

**Probleem:** CHAR(4) numeriek = 10.000 mogelijke codes. Bij groei onvoldoende.

**Oplossing:** Alfanumeriek 4 chars (bijv. AB3K) = ~30.000 combinaties (zonder verwarrende tekens O/0/I/1/L).
Vereist:
1. `ALTER TABLE classes ALTER COLUMN code TYPE VARCHAR(6);`
2. `generate_class_code()` functie vervangen (alfanumeriek, zonder O/0/I/1/L)
3. Frontend validatie aanpassen (regex van `\d{4}` naar `[A-Z0-9]{4}`)

**Wanneer:** Pas nodig bij >1.000 actieve klassen. Codes worden hergebruikt bij verwijdering.

#### TP3-5. Gevoelige data uit console.error ✅
**Status:** Voltooid (2026-02-27)
**Effort:** Klein (1 uur)

- [x] `src/utils/errorSanitize.ts` aangemaakt met `sanitizeError()` utility
- [x] `submissions.ts`, `auth.ts`, `AuthContext.tsx` gebruiken nu `sanitizeError()`
- [x] Alleen `message` + `code` worden gelogd, geen schema-informatie

---

### TP4 - TOEKOMSTIG (bij significante groei)

> **Grotere refactors, alleen nodig als de app significant schaalt.**

#### TP4-1. Split AudioService in sub-services
**Effort:** Groot (2-3 dagen)

AudioService is een god-object (loading, caching, playback, scheduling, ambient, waveform). Split in:
- `AudioLoader` — sample loading met retry/timeout
- `AudioPlayer` — playback control
- `TimelineScheduler` — clip scheduling via Tone.Part
- `AmbientAudioManager` — ambient audio

**Waarom later:** Werkt nu, maar wordt onhoudbaar als Volume per Track (#39) en effecten (#33) worden toegevoegd.

#### TP4-2. Factory pattern i.p.v. singleton voor AudioService
**Effort:** Groot (1-2 dagen)

Singleton maakt unit testing onmogelijk. Factory pattern met dependency injection:
```typescript
// NU:  export const audioService = AudioService.getInstance()
// NA:  export function createAudioService(config?: AudioConfig): AudioService
```

#### TP4-3. Tier 1 tests: pure utility functies ✅ VOLTOOID
**Effort:** Medium (1-2 dagen)
**Status:** Voltooid — 209 tests, 5 test bestanden

- [x] `src/utils/audio.ts` — beat/seconde conversies (59 tests)
- [x] `src/utils/clipCollision.ts` — smart snap algoritme (50 tests)
- [x] `src/utils/waveform.ts` — peak extractie (29 tests)
- [x] `src/utils/schemas.ts` — zod validatie (53 tests)
- [x] `src/stores/timelineStore.ts` — store actions (18 tests, reeds bestaand)

Geen mocking nodig, puur input → output.

#### TP4-4. Tier 2 tests: services met Tone.js mock
**Effort:** Groot (2-3 dagen)

- [ ] AudioService methodes met gemockte Tone.js
- [ ] Scheduling logica, play/pause/stop state machine
- [ ] Error handling (failed loads, timeouts)
- [ ] Dependency: `standardized-audio-context-mock`

#### TP4-5. Tier 3 tests: component integratie
**Effort:** Groot (3-5 dagen)

- [ ] UI componenten met gemockte useAudioEngine
- [ ] StudioView interacties met gemockte DnD
- [ ] TeacherDashboard met gemockte Supabase

---

### UX - KINDVRIENDELIJKHEID VERBETERINGEN

> **Score: 6.5/10** — Goede flows, maar ontbrekende error prevention en bekrachtiging.
> Bron: UX/UI analyse rapport (2026-02-27)

#### UX-1. Waarschuwing bij verlaten Studio zonder opslaan ⚠️ KRITIEK
**Status:** Niet begonnen
**Effort:** Klein (1-2 uur)
**Impact:** Data verlies preventie — kind verliest alle arrangementen bij per ongeluk terug klikken

**Probleem:** `handleBack()` in StudioView.tsx (lijn 88-91) navigeert direct naar map zonder confirmatie.

**Oplossing:**
```typescript
const handleBack = () => {
  const hasClips = useTimelineStore.getState().tracks.some(t => t.clips.length > 0);
  if (hasClips) {
    setShowExitWarning(true); // Modal: "Je muziek gaat verloren! Eerst opslaan?"
  } else {
    navigateToMap();
  }
};
```

#### UX-2. Undo/Redo functionaliteit (Ctrl+Z / Ctrl+Shift+Z)
**Status:** Niet begonnen
**Effort:** Groot (1-2 dagen)
**Impact:** Foutherstel — kinderen maken fouten en kunnen niet terug

**Probleem:** Alleen Space (play/pause) en Ctrl+D (duplicate) als keyboard shortcuts. Geen undo.

**Oplossing:** Undo stack in timelineStore (minimaal 10 stappen):
```typescript
// timelineStore uitbreiden
interface TimelineState {
  // ... bestaande velden
  history: TimelineSnapshot[];     // max 10
  historyIndex: number;
  pushHistory: () => void;         // voor elke mutatie
  undo: () => void;
  redo: () => void;
}
```

**Risico:** Elke timeline-mutatie (addClip, moveClip, removeClip, duplicateClip, trim) moet `pushHistory()` aanroepen. Vergeten = inconsistente undo stack.

#### UX-3. Succes-animatie bij sample verzamelen
**Status:** Niet begonnen
**Effort:** Medium (3-4 uur)
**Impact:** Positieve bekrachtiging — hotspot verdwijnt nu zonder viering

**Probleem:** Kind klikt op hotspot, geluid speelt, hotspot verdwijnt. Geen visuele bevestiging dat iets goed is gegaan.

**Oplossing:** Korte animatie-sequence:
1. Hotspot schaalt op (scale 1.3) met glow
2. Geluid speelt + korte "pling" bevestiging
3. Hotspot animeert richting recorder bar
4. Recorder slot bounced bij ontvangst

#### UX-4. Kindvriendelijker vocabulaire
**Status:** Niet begonnen
**Effort:** Klein (1-2 uur)
**Impact:** Begrijpelijkheid voor 6-8 jarigen

| Huidig | Probleem | Beter |
|--------|----------|-------|
| "Compositie" | Abstract muziekterm | "Mijn muziek" of "Mijn nummer" |
| "Bibliotheek" | Kinderen denken: boeken | "Mijn geluiden" |
| "Samples" | Engels jargon | "Geluiden" |

**Aanpak:** Wijzig i18n keys in `nl.json` en `en.json`. Geen code-wijzigingen nodig.

#### UX-5. Studio cognitive load verminderen
**Status:** Niet begonnen
**Effort:** Medium (3-4 uur)
**Impact:** Minder overweldigend voor 6-8 jarigen

**Probleem:** 8 lege tracks zichtbaar + SampleLibrary + Timeline + EditToolbar + Transport.

**Oplossing:** Auto-collapse lege tracks, toon initieel 2-3 tracks. Tracks verschijnen automatisch wanneer clips worden toegevoegd.

#### UX-6. StageView knoppen hiërarchie
**Status:** Niet begonnen
**Effort:** Klein (30 min)
**Impact:** Duidelijker primaire actie

**Probleem:** Save, Export, Share Link, Share Teacher zijn allemaal even groot/prominent.

**Oplossing:** "Opslaan" als primaire knop (groter, accent kleur), overige als secondary/ghost.

#### UX-7. EditToolbar knoppen vergroten
**Status:** Niet begonnen
**Effort:** Klein (30 min)
**Impact:** Betere touch targets voor fijne motoriek kinderen

**Probleem:** Icon buttons ~32px (p-1.5 = 6px padding + 16px icon).

**Oplossing:** Vergroot naar minimaal 40-44px clickable area (WCAG minimum).

#### UX-8. Klascode projector-modus (docent)
**Status:** Niet begonnen
**Effort:** Klein (1-2 uur)
**Impact:** Klasgebruik — docent moet nu code mondeling delen

**Oplossing:** "Toon op scherm" knop in ClassDetail die 4-cijferige code groot toont (fullscreen overlay, grote letters, duidelijk leesbaar op digibord).

---

### ACCESSIBILITY (WCAG 2.1 AA)

> **Score: 3.5/10** — Kritiek: keyboard navigatie, screen reader support, DnD toegankelijkheid.
> **38 issues gevonden:** 6 Critical, 24 Major, 8 Minor
> Bron: Accessibility analyse rapport (2026-02-27)

#### A11Y-CRITICAL: Fundamentele toegankelijkheidsproblemen

##### A11Y-1. DnD zonder keyboard alternatief ⚠️ WCAG 2.1.1 (Level A)
**Status:** Niet begonnen
**Effort:** Groot (1-2 dagen)
**Impact:** Kinderen met motorische beperkingen kunnen geen composities maken

**Probleem:** DnD-kit dragging alleen via muis/touch. Geen keyboard alternatief.

**Oplossing:** Button-based plaatsing als alternatief:
- "Voeg toe aan track 1/2/3..." dropdown bij elke library sample
- Keyboard navigatie: Tab door samples, Enter om track te kiezen
- Clip verplaatsen via keyboard: pijltjestoetsen voor beat-positie

##### A11Y-2. Playhead niet toegankelijk ⚠️ WCAG 1.3.1 (Level A)
**Status:** Niet begonnen
**Effort:** Medium (2-3 uur)

**Probleem:** Drag handle is `<div>` zonder `role="slider"`, geen keyboard, geen ARIA.

**Oplossing:**
```html
<div
  role="slider"
  tabIndex={0}
  aria-valuenow={currentBeat}
  aria-valuemin={0}
  aria-valuemax={totalBeats}
  aria-label={t('studio.playhead')}
  onKeyDown={handleArrowKeys}  // ← → voor seek
/>
```

##### A11Y-3. Timeline niet leesbaar voor screen readers ⚠️ WCAG 1.3.1 (Level A)
**Status:** Niet begonnen
**Effort:** Groot (1-2 dagen)

**Probleem:** Tracks en clips zijn pure divs met style positioning. Screen reader begrijpt niets.

**Oplossing:** Semantische structuur:
- Track: `role="list"`, `aria-label="Track 1"`
- Clip: `role="listitem"`, `aria-label="Park Birds, start beat 4, duur 2 beats"`
- Live region voor playback status updates

##### A11Y-4. Clips zijn divs met onClick ⚠️ WCAG 2.1.1 (Level A)
**Status:** Niet begonnen
**Effort:** Klein (1 uur)

**Probleem:** Clip.tsx lijn 59-86: geen `role="button"`, `aria-selected`, keyboard Enter/Space.

**Oplossing:** Voeg toe: `role="button"`, `tabIndex={0}`, `aria-selected`, `onKeyDown` voor Enter/Space.

##### A11Y-5. ZoomableView alleen pointer events ⚠️ WCAG 2.1.1 (Level A)
**Status:** Niet begonnen
**Effort:** Medium (2-3 uur)

**Probleem:** Geen pijltjestoetsen voor pannen, geen +/- voor zoom.

**Oplossing:** Keyboard handlers: pijltjestoetsen voor pan, +/- voor zoom, Home voor reset.

##### A11Y-6. Audio zonder visueel alternatief ⚠️ WCAG 1.2.1 (Level A)
**Status:** Niet begonnen
**Effort:** Groot (1-2 dagen)

**Probleem:** Dove/slechthorende leerlingen zien alleen gekleurde blokken, geen waveforms in timeline.

**Oplossing:** Waveform miniatures in clips tonen (data al beschikbaar via `AudioService.getWaveform()`). Gerelateerd aan toekomstig TP4 item "visueel alternatief voor audio".

#### A11Y-MAJOR: Significante barrières

##### A11Y-7. Quick wins (klein effort, grote impact)
**Status:** Niet begonnen
**Effort:** Klein-Medium (3-4 uur totaal)

Batch van snelle fixes:
- [ ] `aria-label` op alle icon buttons (EditToolbar, TransportControls, Hotspot)
- [ ] Focus trap in Modal component (`Modal.tsx`)
- [ ] `<label>` koppelen aan form inputs (`ShareCodeInput.tsx`)
- [ ] `prefers-reduced-motion` support (stop animaties bij voorkeur)
- [ ] Focus indicators op EditToolbar buttons
- [ ] Focus management bij modal open/close
- [ ] `aria-describedby` op Modal body
- [ ] Form errors in `aria-live` regio (FeedbackModal)
- [ ] Dynamische `<title>` per scherm (App.tsx)
- [ ] Heading hiërarchie corrigeren (h3 zonder h2 in Timeline)

##### A11Y-8. Kleur-onafhankelijke status indicatie
**Status:** Niet begonnen
**Effort:** Klein (1 uur)

**Probleem:** Locatie voortgang alleen via kleur (LocationMarker). Contrast te laag op disabled states.

**Oplossing:** Voeg iconen/tekst toe naast kleur-indicatie. Verhoog contrast op disabled states.

---

### PERFORMANCE VERBETERINGEN

> **Score: 5.0/10** — Geen code splitting, 20Hz re-renders, geen image optimalisatie.
> Bron: Performance analyse rapport (2026-02-27)

#### PERF-1. Route-level code splitting ⚠️ KRITIEK
**Status:** Niet begonnen
**Effort:** Medium (3-4 uur)
**Impact:** Bundle -50%, eerste paint -500ms

**Probleem:** ALLE schermen statisch geïmporteerd in App.tsx. Studenten laden teacher dashboard, shared player, etc.

**Geschatte bundle (gzipped):**
```
tone@15          ~100-150 KB
react+react-dom  ~80 KB
@dnd-kit         ~60 KB
i18next          ~40 KB
@supabase        ~30 KB
lamejs           ~40 KB
app code         ~50 KB
─────────────────────────
Totaal:          ~250-300 KB + audio assets
```

**Oplossing:**
```typescript
// App.tsx
const StudioView = React.lazy(() => import('./components/studio/StudioView'));
const StageView = React.lazy(() => import('./components/stage/StageView'));
const TeacherDashboard = React.lazy(() => import('./components/teacher/TeacherDashboard'));
const SharedPlayer = React.lazy(() => import('./components/share/SharedPlayer'));

// + Suspense wrapper met loading spinner
```

#### PERF-2. currentBeat re-render cascade
**Status:** Niet begonnen
**Effort:** Medium (3-4 uur)
**Impact:** 20x minder re-renders tijdens playback

**Probleem:** `setCurrentBeat()` elke 50ms triggert Zustand subscribers. Timeline + StudioView + alle children renderen ~20x/sec.

**Oplossing:** Gebruik `useRef` + `requestAnimationFrame` voor playhead positie. Playhead leest direct uit ref, geen store update nodig voor pure visuele update. Alleen bij seek/stop de store updaten.

#### PERF-3. Vite build optimalisatie
**Status:** Niet begonnen
**Effort:** Klein (1 uur)

**Probleem:** `vite.config.ts` is 7 regels, geen manualChunks.

**Oplossing:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'tone': ['tone'],
        'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        'audio-export': ['@breezystack/lamejs'],
        'supabase': ['@supabase/supabase-js'],
      }
    }
  }
}
```

#### PERF-4. Image optimalisatie
**Status:** Niet begonnen
**Effort:** Medium (2-3 uur)

**Probleem:** Geen srcset, geen lazy loading, geen WebP, geen blur-up placeholder. Mobiel laadt full-resolution images.

**Oplossing:**
- [ ] Lazy loading op map/location afbeeldingen (`loading="lazy"`)
- [ ] WebP versies genereren van alle PNG achtergronden
- [ ] `srcset` voor responsive image loading
- [ ] Optioneel: blur-up placeholder voor locatie-achtergronden

#### PERF-5. Timeline grid memoization
**Status:** Niet begonnen
**Effort:** Klein (30 min)

**Probleem:** gridLines array + widthMultiplier herberekend elke 50ms (bij elke currentBeat update).

**Oplossing:** `useMemo()` met dependency op `totalBeats` (niet `currentBeat`).

---

### SEO & DEPLOYMENT VERBETERINGEN

> **Score: 2.5/10** — Geen meta tags, geen PWA, geen caching strategie.
> Bron: SEO & Deployment analyse rapport (2026-02-27)

#### DEPLOY-1. SEO meta tags + Open Graph ⚠️ KRITIEK
**Status:** Niet begonnen
**Effort:** Klein (1 uur)

**Probleem:** index.html mist: `<meta name="description">`, Open Graph tags, Twitter Card tags, `<meta name="theme-color">`, `<link rel="canonical">`.

**Impact:** Geen rich previews bij social media delen (belangrijk voor share links!), geen SEO.

**Oplossing:**
```html
<meta name="description" content="SoundScout - Leer muziek maken door geluiden te ontdekken en te combineren">
<meta name="theme-color" content="#0f172a">
<meta property="og:title" content="SoundScout">
<meta property="og:description" content="Muziek maken door geluiden te ontdekken">
<meta property="og:image" content="/images/og-image.png">
<meta property="og:type" content="website">
<link rel="canonical" href="https://soundscout.nl">
```

#### DEPLOY-2. PWA manifest (installeerbaar op tablet)
**Status:** Niet begonnen
**Effort:** Klein (1-2 uur)

**Probleem:** Geen manifest.json, app niet installeerbaar. Geen offline support.

**Impact:** Leerlingen kunnen app niet "installeren" op tablet/Chromebook. Problematisch bij slecht school-internet.

**Oplossing:**
- [ ] `manifest.json` aanmaken (name, icons, theme_color, display: standalone)
- [ ] Link in index.html
- [ ] Apple-touch-icon correct configureren

**Notitie:** Service worker voor offline gebruik is P3 (complexer, vereist audio caching strategie).

#### DEPLOY-3. Caching headers voor audio assets
**Status:** Niet begonnen
**Effort:** Klein (30 min)

**Probleem:** 62+ MP3's worden elke keer opnieuw geladen. Geen Cache-Control headers.

**Oplossing (.htaccess):**
```apache
# Audio + afbeeldingen: 1 jaar cache (versioned via Vite hash)
<FilesMatch "\.(mp3|jpg|png|svg|webp|woff2?)$">
  Header set Cache-Control "max-age=31536000, immutable"
</FilesMatch>

# HTML: 1 uur cache
<FilesMatch "\.html$">
  Header set Cache-Control "max-age=3600, must-revalidate"
</FilesMatch>

# Compressie
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
```

#### DEPLOY-4. Fix `<html lang="nl">`
**Status:** Niet begonnen
**Effort:** Klein (15 min)

**Probleem:** `<html lang="en">` terwijl app standaard Nederlands is.

**Oplossing:** Wijzig naar `lang="nl"` + dynamisch bijwerken bij taalwissel in i18n config:
```typescript
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
```

#### DEPLOY-5. Content Security Policy (CSP)
**Status:** Niet begonnen
**Effort:** Medium (2-3 uur)

**Probleem:** Geen CSP headers. XSS niet geblokkeerd op server-niveau.

**Oplossing:** CSP in .htaccess met whitelists voor Supabase, EmailJS, Google Fonts.

#### DEPLOY-6. Favicon pad fix
**Status:** Niet begonnen
**Effort:** Klein (15 min)

**Probleem:** index.html lijn 8 verwijst naar `/images/overige/logo-soundscout.svg` — pad mogelijk incorrect.

#### DEPLOY-7. Environment-specifieke builds
**Status:** Niet begonnen
**Effort:** Medium (1-2 uur)

**Probleem:** Alleen `.env.local`. Geen `.env.production`, `.env.staging`. Geen error tracking (Sentry), geen analytics.

---

### Implementatie Volgorde (aanbevolen)

```
Week 1: TP0 (alle 4 items) + TP1-2 (fade timeout fix)
         + UX-1 (exit warning) + DEPLOY-4 (lang fix) + DEPLOY-6 (favicon)
         → Veilige, stabiele basis + quick wins

Week 2: TP1-1 (StageView split) + TP1-5 (orchestratie)
         + DEPLOY-1 (meta tags) + DEPLOY-2 (PWA manifest) + DEPLOY-3 (caching)
         → Klaar voor Template Systeem (#21) + deployment kwaliteit

Week 3: TP1-3 (error handling) + TP1-4 (error boundaries)
         + UX-7 (EditToolbar buttons) + UX-6 (StageView knoppen)
         + A11Y-7 (quick wins batch)
         → Robuuste foutafhandeling + basis accessibility

Week 4: PERF-1 (code splitting) + PERF-3 (Vite build) + PERF-5 (memoization)
         → Performance optimalisatie

Daarna: TP2 items + UX items oppakken als onderdeel van feature-werk
        (bijv. UX-4 vocabulaire samen met i18n review #38)
        (bijv. PERF-2 currentBeat samen met Volume per Track #39)

Later:  A11Y-1 t/m A11Y-6 (grote accessibility items)
        UX-2 (undo/redo) — groot maar zeer waardevol
        PERF-4 (image optimalisatie)
        DEPLOY-5 (CSP) + DEPLOY-7 (environments)

TP3/TP4: Oppakken wanneer relevant of bij beschikbare tijd
```

---

## 🔴 P1 - HOOGSTE PRIORITEIT (nu)

### 23. Vereenvoudigde Transport Controls (Play/Rewind) ✅
**Status:** VOLTOOID (2026-02-05)
**Complexiteit:** ⭐ Laag
**Bron:** Gebruiker feedback (2026-02-05)

**Beschrijving:**
Transport controls vereenvoudigd van `[Play] [Pause] [Stop] [Loop] | [Alles Wissen]` naar `[Play/Pause] [Rewind] [Loop]`.

**Geïmplementeerd:**
- [x] Play/Pause was al een toggle (bestaande functionaliteit)
- [x] Stop knop vervangen door Rewind knop (SkipBack icoon)
- [x] "Alles Wissen" knop verwijderd
- [x] Vertalingen: `transport.rewind` toegevoegd (NL: "Terug", EN: "Rewind")

**Gewijzigde bestanden:**
- `src/components/studio/TransportControls.tsx` - UI vereenvoudigd
- `src/hooks/useStudioPlayback.ts` - `handleRewind` toegevoegd
- `src/components/studio/StudioView.tsx` - Props aangepast
- `src/i18n/locales/nl.json` - "rewind": "Terug"
- `src/i18n/locales/en.json` - "rewind": "Rewind"

**Notities:**
- `handleStop` blijft intern beschikbaar voor navigatie (bijv. terug naar map)
- `handleRewind` = `handleStop` (zelfde gedrag: stop + ga naar beat 0)

### 24. Getrimde Clip Visuele Lengte bij Drag ✅
**Status:** VOLTOOID (2026-02-05)
**Complexiteit:** ⭐⭐ Medium
**Bron:** Gebruiker feedback (2026-02-05)

**Probleem:**
Wanneer je een getrimde clip sleept, toonde de snap preview de volledige originele sample lengte in plaats van de getrimde lengte.

**Oorzaak:**
In `useStudioDnD.ts` lijn 187 werd `secondsToBeats(sample.duration, bpm)` gebruikt, wat de trim boundaries negeerde.

**Geïmplementeerd:**
- [x] `activeDragClipRef` toegevoegd om clip data op te slaan bij drag start
- [x] Import `getClipDurationBeats` van audio utils
- [x] In `handleDragMove`: juiste durationBeats berekening afhankelijk van drag type
- [x] Voor clip drags: `getClipDurationBeats(clip, sample, bpm)` (respecteert trim)
- [x] Voor sample drags: `secondsToBeats(sample.duration, bpm)` (volledige lengte)
- [x] Ref reset in `handleDragEnd` en `handleDragCancel`

**Gewijzigde bestanden:**
- `src/hooks/useStudioDnD.ts` - Nieuwe ref, import, logica in handleDragMove

### 25. Getrimde Clip Kopiëren/Dupliceren ✅
**Status:** VOLTOOID (2026-02-05)
**Complexiteit:** ⭐⭐ Medium
**Bron:** Gebruiker feedback (2026-02-05)

**Beschrijving:**
Clips kunnen nu worden gedupliceerd inclusief alle trim settings. De gedupliceerde clip wordt direct na de originele clip geplaatst (of op de volgende beschikbare positie via smart snap).

**Geïmplementeerd:**
- [x] `duplicateClip()` functie in timelineStore
- [x] Dupliceert clip inclusief trimStart, trimEnd, effects
- [x] Smart snap: plaatst na originele clip of op volgende track als geen ruimte
- [x] Keyboard shortcut: Ctrl+D / Cmd+D
- [x] Na duplicatie wordt nieuwe clip automatisch geselecteerd
- [x] Copy knop in EditToolbar (was al voorbereid, nu actief)

**Gewijzigde bestanden:**
- `src/stores/timelineStore.ts` - `duplicateClip()` functie
- `src/components/studio/StudioView.tsx` - `handleDuplicate()`, keyboard shortcut, prop doorgeven

**Plaatsingsstrategie:**
1. Bereken eindpositie van originele clip (startBeat + durationBeats)
2. Plaats duplicaat direct daarna (afgerond naar boven)
3. Als overlap: gebruik smart snap (schuif of track eronder)
4. Als nergens ruimte: geen duplicatie (rejected)

---

## 🟠 P2 - HOGE PRIORITEIT

### 13. Thema Selectie Modal ✅
**Status:** VOLTOOID (2026-02-10)
**Complexiteit:** ⭐⭐ Medium

**Beschrijving:**
Bij "Nieuwe compositie" opent nu een modal met visuele kaartjes van alle beschikbare thema's. Gebruiker klikt op een thema om te starten.

**Geïmplementeerd:**
- [x] `ThemeSelectionModal.tsx` component
- [x] Grid layout met kaartjes (map preview + titel + beschrijving)
- [x] Hover effect met "Kiezen" knop overlay
- [x] Modal wordt geopend vanuit StartScreen
- [x] Na selectie: `setTheme()` → `goToMap()`
- [x] `winterspelen` thema nu publiek (isPublic: true)
- [x] `test-metro` thema verwijderd
- [x] Vertalingen NL + EN

**Gewijzigde/nieuwe bestanden:**
- `src/components/ThemeSelectionModal.tsx` (nieuw)
- `src/components/StartScreen.tsx` - modal state + trigger
- `src/data/themes/index.ts` - test-metro verwijderd
- `src/data/themes/winterspelen/index.ts` - isPublic: true
- `src/i18n/locales/nl.json` - themeSelection keys
- `src/i18n/locales/en.json` - themeSelection keys

### 14. Delen met Link (4.3) ✅
**Status:** VOLTOOID (2026-02-27)
**Complexiteit:** ⭐⭐⭐ Medium-Hoog
**Documentatie:** `docs/PLAN-DELEN-MET-LINK.md`

**Beschrijving:**
Leerlingen kunnen een publieke luisterlink genereren voor hun compositie. Iedereen met de link of code kan de compositie beluisteren in een read-only player. Links verlopen na 30 dagen.

**Aanpak:** Bestaande `submissions` tabel uitgebreid (Optie A) i.p.v. aparte tabel, om duplicatie te voorkomen.

**Database wijzigingen:**
- [x] `share_code` (VARCHAR 8, UNIQUE), `expires_at` (TIMESTAMPTZ), `view_count` (INT) kolommen toegevoegd
- [x] `class_id` nullable gemaakt (publieke shares hebben geen klas)
- [x] Foreign key gewijzigd van CASCADE naar SET NULL (composities overleven klas-verwijdering)
- [x] Partial index op `share_code`
- [x] RLS policy voor publiek lezen van gedeelde composities
- [x] `generate_share_code()` functie (8-karakter, charset zonder I/O/0/1)
- [x] `share_composition()` RPC (SECURITY DEFINER, anon + authenticated)
- [x] `get_shared_composition()` RPC (verhoogt view_count)

**Frontend:**
- [x] "Deel link" knop in StageView (tussen "Download MP3" en "Deel met docent")
- [x] ShareLinkModal met bevestigingsstap (voorkomt zinloze records)
- [x] Twee-staps flow: uitleg → "Link aanmaken" → link + code + kopieerknop
- [x] SharedPlayer: fullscreen read-only player met audio playback
- [x] ShareCodeInput op StartScreen voor code-invoer
- [x] URL-based toegang: `?share=CODE` wordt gedetecteerd in App.tsx
- [x] Clipboard API met fallback voor link kopiëren
- [x] Vertalingen NL + EN (share.* keys)

**Nieuwe bestanden:**
- `supabase/migration-delen-met-link.sql` — SQL migratiescript (8 stappen)
- `docs/PLAN-DELEN-MET-LINK.md` — Implementatieplan
- `src/components/share/ShareLinkModal.tsx` — Modal met bevestiging + link generatie
- `src/components/share/SharedPlayer.tsx` — Read-only player voor gedeelde composities
- `src/components/share/ShareCodeInput.tsx` — Code-invoerveld voor StartScreen

**Gewijzigde bestanden:**
- `supabase/schema.sql` — Bijgewerkt met nieuwe kolommen, index, RLS, functies
- `src/lib/submissions.ts` — `shareComposition()`, `getSharedComposition()`
- `src/stores/appStore.ts` — `shareCode` state, `goToShared()` action
- `src/types/index.ts` — `'shared'` toegevoegd aan `GameScreen`
- `src/components/stage/StageView.tsx` — "Deel link" knop
- `src/App.tsx` — `?share=` detectie, `'shared'` screen case
- `src/components/StartScreen.tsx` — ShareCodeInput integratie
- `src/i18n/locales/nl.json` — share.* vertalingen
- `src/i18n/locales/en.json` — share.* vertalingen

**Aandachtspunten:**
- SQL migratie moet handmatig uitgevoerd worden in Supabase SQL Editor (8 stappen)
- Links verlopen na 30 dagen (check at query time, geen cron nodig)
- Bevestigingsstap in ShareLinkModal voorkomt dat er records worden aangemaakt bij per ongeluk openen
- Share codes zijn 8 karakters lang, charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (geen I, O, 0, 1 om verwarring te voorkomen)
- Bestaande submissions (met class_id) blijven onaangetast door de migratie
- Bij klas-verwijdering worden gekoppelde submissions niet meer verwijderd (SET NULL i.p.v. CASCADE)

### 15. Emergency/Feedback Systeem ✅
**Status:** VOLTOOID (2026-02-05)
**Complexiteit:** ⭐⭐ Medium
**Bron:** Gebruiker feedback (2026-02-03)
**Plan:** `docs/PLAN-EMERGENCY-FEEDBACK.md`

**Beschrijving:**
Feedback systeem waarmee gebruikers problemen kunnen melden via EmailJS.

**Geïmplementeerd:**
- [x] FeedbackModal component met twee modi (error/feedback)
- [x] ErrorBoundary integratie met "Stuur foutmelding" knop
- [x] "Hulp nodig?" knop in StartScreen footer
- [x] Categorie selectie (bug, confusion, other)
- [x] Beschrijving veld met validatie (min 10 karakters)
- [x] EmailJS integratie voor email verzending
- [x] Rate limiting (60 seconden tussen submissions)
- [x] Automatische context collectie (URL, browser, schermgrootte)
- [x] i18n support (NL + EN)

**Nieuwe bestanden:**
- `src/components/feedback/FeedbackService.ts`
- `src/components/feedback/FeedbackModal.tsx`
- `src/components/feedback/index.ts`

**Gewijzigde bestanden:**
- `src/components/common/ErrorBoundary.tsx` - FeedbackModal integratie
- `src/components/StartScreen.tsx` - "Hulp nodig?" knop
- `src/i18n/locales/nl.json` - feedback vertalingen
- `src/i18n/locales/en.json` - feedback vertalingen

### 16. Touch Gevoeligheid & Autoplay Issues
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐ Medium-Hoog
**Bron:** Gebruiker feedback (2026-02-03) - problemen op tablets en mobiles

**Probleem:**
Touch interacties werken niet optimaal op tablets en mobiele apparaten. Mogelijk ook issues met automatisch afspelen van audio.

**Te onderzoeken:**
- [ ] Test touch gevoeligheid op verschillende tablets (iPad, Android, Chromebook)
- [ ] Test drag-and-drop op touchscreens
- [ ] Autoplay beleid van verschillende browsers
- [ ] Audio context initialisatie op mobile

**Mogelijke problemen:**
- Touch targets te klein
- Drag threshold niet geoptimaliseerd voor touch
- Audio autoplay geblokkeerd door browser
- Dubbele touch events (touch + click)

**Mogelijke oplossingen:**
- [ ] Verhoog drag threshold voor touch (nu 150ms delay)
- [ ] Vergroot touch targets waar nodig
- [ ] Expliciete "Tik om audio te starten" prompt
- [ ] Prevent default op touch events waar nodig
- [ ] Test met `touch-action: none` op drag elements

**Huidige configuratie (te reviewen):**
```typescript
// In StudioView.tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
);
```

### 35. Tweetalig Systeem Grondig Implementeren (i18n Audit) ✅
**Status:** VOLTOOID (2026-02-27)
**Complexiteit:** ⭐⭐ Medium
**Terugkerend:** Zie P5 #38 voor periodieke review

**Beschrijving:**
Grondig gecontroleerd en aangevuld: het tweetalige systeem (Nederlands + Engels). Alle UI-teksten, error messages, placeholders en modals zijn nu volledig vertaald. Taalswitcher toegevoegd op het startscherm.

**Geïmplementeerd:**

**Locale bestanden (~150 nieuwe keys):**
- [x] `language` sectie (NL/EN labels)
- [x] `common` uitgebreid (cancel, delete, tracks, clips, samples, play, pause, stop, by)
- [x] `start` uitgebreid (teacherLink, createdBy, aboutButton, aboutTitle, aboutText1-3)
- [x] `map` uitgebreid (loadingTheme, studioShort, cityMapAlt)
- [x] `stage` uitgebreid (subtitle, shareWithTeacher, defaultName)
- [x] `share` uitgebreid (loadingSamples)
- [x] `error` sectie (title, description, retryButton, sendReportButton, technicalDetails)
- [x] `auth` sectie (8 foutmeldingen)
- [x] `submissions` sectie (5 foutmeldingen)
- [x] `teacher` sectie met 10+ subsecties (common, validation, login, register, forgotPassword, dashboard, classDetail, createClassModal, submissionPlayer, classCard, submissionCard, shareWithTeacher)

**i18n configuratie:**
- [x] localStorage persistentie voor taalvoorkeur (`soundscout-lang` key)
- [x] `i18n.on('languageChanged')` event listener voor opslaan

**LanguageSwitcher component:**
- [x] `src/components/ui/LanguageSwitcher.tsx` (nieuw)
- [x] Compacte pill-vorm: `NL | EN` toggle
- [x] Twee varianten: `dark` (mobile) en `light` (desktop)
- [x] Geplaatst op StartScreen boven footer

**17+ componenten geüpdatet met t() calls:**
- [x] StartScreen.tsx — 6 hardcoded strings + taalswitcher
- [x] StageView.tsx — 4 hardcoded strings (subtitle, shareWithTeacher, defaultName)
- [x] MapView.tsx — 3 hardcoded strings (loadingTheme, studioShort, cityMapAlt)
- [x] ErrorBoundary.tsx — 5 hardcoded strings (via `i18n.t()`, class component)
- [x] ShareWithTeacherModal.tsx — 21 hardcoded strings
- [x] TeacherLogin.tsx — 8 hardcoded strings
- [x] TeacherRegister.tsx — 14 hardcoded strings
- [x] TeacherForgotPassword.tsx — 11 hardcoded strings
- [x] TeacherDashboard.tsx — 12 hardcoded strings
- [x] ClassDetail.tsx — 9 hardcoded strings
- [x] CreateClassModal.tsx — 7 hardcoded strings
- [x] SubmissionPlayer.tsx — 8 hardcoded strings
- [x] ClassCard.tsx — 3 hardcoded strings
- [x] SubmissionCard.tsx — 3 hardcoded strings
- [x] lib/auth.ts — 8 error messages
- [x] lib/submissions.ts — 5 error messages
- [x] App.tsx — 1 laadtekst

**Nieuwe/gewijzigde bestanden:**
- `src/components/ui/LanguageSwitcher.tsx` (nieuw)
- `src/components/ui/index.ts` — export toegevoegd
- `src/i18n/index.ts` — localStorage persistentie
- `src/i18n/locales/nl.json` — ~150 nieuwe keys
- `src/i18n/locales/en.json` — ~150 nieuwe keys (volledige pariteit met NL)
- Alle bovengenoemde componenten

**Restpunten (niet-blokkerend):**
- `console.error` berichten in `lib/auth.ts` zijn nog in het Nederlands (developer-only, niet user-facing)
- `LocationEditor.tsx` (~25 strings) niet vertaald — admin-only tool, lage prioriteit

### 36. Playhead Seeking in Docenten Compositie Viewer ✅
**Status:** VOLTOOID (2026-02-27)
**Complexiteit:** ⭐ Laag (hergebruik bestaand Playhead component)
**Gerelateerd aan:** Playhead Seeking (#16), Teacher Dashboard (#8)

**Beschrijving:**
Docenten kunnen nu de playhead in de read-only timeline viewer (SubmissionPlayer) verslepen om snel naar een specifiek punt in de compositie te navigeren. Audio speelt correct vanaf de seek positie, inclusief halverwege een clip.

**Geïmplementeerd:**
- [x] Bestaand Playhead component hergebruikt in read-only modus
- [x] Drag-functionaliteit voor playhead (44px touch hitbox, pointer events)
- [x] Audio seek integratie via `Tone.Transport.seconds`
- [x] Ruler strip met klikbare positionering
- [x] Touch support voor tablet gebruik (was al ingebouwd in Playhead)
- [x] Play/Pause respecteert seek positie (altijd reschedule + play from currentBeat)

**Aanpak (minimale wijzigingen):**
De oplossing bestond uit twee kleine wijzigingen:

1. **Timeline.tsx** — Verwijder `!readOnly` guard van Playhead rendering:
```typescript
// VOOR: Playhead alleen in edit mode
{!readOnly && onSeek && (<Playhead .../>)}

// NA: Playhead wanneer onSeek beschikbaar is, ongeacht readOnly
{onSeek && (<Playhead .../>)}
```

2. **SubmissionPlayer.tsx** — Voeg seek handler + aangepaste play logica toe:
```typescript
const handleSeek = useCallback((beat: number) => {
  setCurrentBeat(beat);
  const transport = Tone.getTransport();
  transport.seconds = beatsToSeconds(beat, bpm);
}, [bpm]);

// handlePlayPause: altijd reschedule zodat seek positie gerespecteerd wordt
audioService.scheduleTimeline(tracks, samples);
audioService.setLoop(isLooping, totalBeats);
audioService.play(currentBeat);
```

**Gewijzigde bestanden (3):**
- `src/components/studio/Timeline.tsx` — Verwijder `!readOnly` conditie voor Playhead, update fallback line conditie
- `src/components/teacher/SubmissionPlayer.tsx` — `handleSeek` callback, `beatsToSeconds` import, `onSeek` prop naar Timeline
- (Playhead.tsx ongewijzigd — werkte al correct in read-only context)

### 37. Grijs Leeg Gedeelte onder Timeline Tracks Verwijderen ✅
**Status:** VOLTOOID (2026-02-27)
**Complexiteit:** ⭐ Laag
**Bron:** Visuele inspectie (2026-02-27)

**Probleem:**
De studio view scrollde verticaal voorbij de 8 tracks. Bij scrollen verscheen een grijs leeg gedeelte (`bg-studio-bg` achtergrond) onder de TransportControls.

**Oorzaak:**
`min-h-screen` (= `min-height: 100vh`) op de StudioView outer div. Op mobile browsers is `100vh` groter dan het daadwerkelijke zichtbare scherm (inclusief address bar), waardoor de container groter werd dan het viewport en de browser scrollbaar was.

**Oplossing:**
- `min-h-screen` vervangen door `h-dvh overflow-hidden`
- `h-dvh` = dynamic viewport height, past zich aan aan het daadwerkelijke zichtbare viewport
- `overflow-hidden` voorkomt dat de pagina zelf scrollt
- Interne scroll (SampleLibrary verticaal, Timeline horizontaal) blijft werken

**Gewijzigde bestanden:**
- `src/components/studio/StudioView.tsx` — `min-h-screen` → `h-dvh overflow-hidden`

### 22. Real-time Geluiden Toevoegen tijdens Afspelen
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐⭐ Hoog
**Bron:** Gebruiker feedback (2026-02-05)

**Beschrijving:**
Tijdens het afspelen van de timeline moeten gebruikers nieuwe samples kunnen toevoegen die direct meespelen. Nu moet je eerst stoppen om iets toe te voegen.

**Te implementeren:**
- [ ] Timeline drag-and-drop actief houden tijdens playback
- [ ] Nieuwe clip toevoegen zonder transport te stoppen
- [ ] Clip direct inplannen in lopende Tone.Part
- [ ] Visuele feedback bij toevoegen tijdens afspelen

**Technische uitdaging:**
Tone.Part dynamisch updaten of nieuwe events toevoegen terwijl transport loopt. Mogelijk alternatief: alleen preview afspelen van nieuwe clip, daarna stoppen voor plaatsing.

### 21. Template Systeem voor Docenten
**Status:** Niet begonnen
**Complexiteit:** ⭐ Laag
**Risico:** Laag
**Geschatte tijd:** 2-3 dagen
**Bron:** Gebruiker feedback (2026-02-05) + brainstorm educatieve features (2026-02-27)

**Beschrijving:**
Docenten kunnen een "template" compositie klaarzetten die leerlingen als startpunt gebruiken. Bijvoorbeeld: drumbeat al op track 1, of bepaalde structuur voorbereid. Combineert goed met scène-markering (#40): docent kan template mét scène-indeling klaarzetten.

**Waarom lage complexiteit:**
De infrastructuur bestaat al grotendeels:
- `loadTimeline()` in timelineStore kan bestaande compositie laden
- `ThemeSelectionModal.tsx` is een kant-en-klaar UI-patroon
- Een template is in feite een `SavedComposition` met extra metadata

**Te implementeren:**
- [ ] Template type uitbreiden: `SavedComposition` + categorie, beschrijving, moeilijkheidsgraad
- [ ] "Opslaan als Template" optie in studio (docent-only)
- [ ] Template koppelen aan een klas (Supabase tabel `templates`)
- [ ] Leerling start met template i.p.v. lege timeline
- [ ] TemplateSelectionModal (kopie van ThemeSelectionModal patroon)
- [ ] UI in docent dashboard voor template beheer

**Technische aanpak:**
```typescript
// Template is SavedComposition + metadata
interface CompositionTemplate extends SavedComposition {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  classId?: string; // gekoppeld aan specifieke klas
}
```
- Opslag: Supabase `templates` tabel OF JSON bundled in app
- Laden: hergebruik `loadTimeline()` met template data
- Docent-flow: Studio → "Opslaan als template" → koppel aan klas
- Leerling-flow: Klas openen → template kiezen → voorgevulde timeline

### 39. Volume per Track (Mixer)
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐ Medium-Hoog
**Risico:** Medium
**Geschatte tijd:** 3-4 dagen
**Bron:** Brainstorm educatieve features (2026-02-27)

**Beschrijving:**
Kinderen kunnen per track het volume aanpassen, zoals een eenvoudig mengpaneel. Dit leert over dynamiek en balans in een compositie. Start met per-track volume (niet per clip) — dat is begrijpelijker en visueel helderder.

**Huidige architectuur (probleem):**
AudioService routeert elke `Tone.Player` direct naar `Tone.Destination`. Er is geen tussenliggende laag per track.

**Te implementeren:**
- [ ] `volume` field toevoegen aan `Track` type (default: 0dB)
- [ ] Per-track `Tone.Gain` nodes aanmaken in `AudioService.scheduleTimeline()`
- [ ] Audio routing: `Player → Gain → Destination` (i.p.v. `Player → Destination`)
- [ ] Gain nodes synchroniseren met pause/resume/seek
- [ ] Volume slider UI links van elke track (20-30px breed)
- [ ] Track volume opslaan in composities (StorageService)
- [ ] Volume meenemen in MP3 export (`audioExport.ts`)

**Technische aanpak:**
```typescript
// Track type uitbreiden
interface Track {
  id: string;
  clips: Clip[];
  volume?: number;  // dB, default 0
  muted?: boolean;  // optioneel: mute toggle
}

// AudioService: gain nodes per track
private trackGains: Map<number, Tone.Gain> = new Map();

scheduleTimeline(tracks, samples) {
  // Maak gain node per track
  tracks.forEach((track, i) => {
    const gain = new Tone.Gain(dbToGain(track.volume ?? 0)).toDestination();
    this.trackGains.set(i, gain);
  });
  // Route players door juiste gain node
  player.connect(this.trackGains.get(trackIndex)!);
}
```

**Risico's:**
- Audio routing wijziging raakt hele pipeline (seeking, looping, pause/resume)
- Track UI heeft weinig ruimte — slider moet compact zijn
- MP3 export moet gain-levels respecteren

### 40. Scène-markering op Timeline
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐ Medium
**Risico:** Laag
**Geschatte tijd:** 2-3 dagen
**Bron:** Brainstorm educatieve features (2026-02-27)
**Gerelateerd aan:** Template Systeem (#21)

**Beschrijving:**
De timeline kan worden ingedeeld in gekleurde secties (scènes) die muzikale vorm zichtbaar maken. Bijvoorbeeld: geel = deel A (maat 1-8), oranje = deel B (maat 9-16), geel = deel A (maat 17-24). Dit leert kinderen over muzikale structuur (ABA, ABAB, rondo) zonder die termen te hoeven kennen.

Scènes zijn globaal (over alle tracks heen), niet per track — dat sluit aan bij hoe muzikale vorm werkt.

**Te implementeren:**
- [ ] `Scene` type toevoegen: `{ id, startBeat, endBeat, name, color }`
- [ ] `scenes: Scene[]` toevoegen aan `TimelineState`
- [ ] Gekleurde achtergrond-divs renderen in Timeline (achter tracks, onder clips)
- [ ] Scène-markering UI: klik op ruler om markeerpunt te plaatsen
- [ ] Scène naam/kleur bewerkbaar (simpele modal of inline)
- [ ] Scroll-synchronisatie met timeline content
- [ ] Scènes opslaan in composities (StorageService)
- [ ] Docent kan scène-indeling meegeven in templates (#21)

**Technische aanpak:**
```typescript
interface Scene {
  id: string;
  startBeat: number;
  endBeat: number;
  name: string;       // "A", "B", "C" of vrije tekst
  color: string;       // Tailwind kleur of hex
}

// TimelineState uitbreiden
interface TimelineState {
  // ... bestaande velden
  scenes: Scene[];
}
```

**Visueel:**
```
Ruler:    |1   |2   |3   |4   |5   |6   |7   |8   |
Scènes:   [====== A (geel) ======][==== B (oranje) ====]
Track 1:  [clip][clip]              [clip]
Track 2:       [clip]         [clip][clip]
```

**Risico's:**
- Z-index management: scène-achtergronden mogen clips niet verbergen
- Scroll-sync moet correct werken bij horizontaal scrollen

---

## 🟡 P3 - MEDIUM PRIORITEIT

### 21. Template Systeem voor Docenten → verplaatst naar P2 (zie #21 onder P2)

### 26. Ambient Audio Cleanup & Pause/Stop Fix (CRIT-3) ✅
**Status:** VOLTOOID (2026-02-26)
**Complexiteit:** ⭐ Laag
**Bron:** Code analyse (2026-02-04) + gebruiker feedback (2026-02-26)

**Problemen (opgelost):**
1. Als component unmount terwijl `loadAmbient()` nog bezig was, werd `playAmbient()` toch aangeroepen
2. Pause knop stopte lopende samples niet — Tone.Players spelen onafhankelijk van transport door
3. Stop knop had zelfde probleem door lookahead-buffered events

**Oplossingen:**

**Ambient cleanup (`useLocationAudio.ts`):**
- `cancelled` flag toegevoegd in ambient useEffect
- `playAmbient()` wordt niet aangeroepen als `cancelled = true`

**Pause fix (`AudioService.ts`):**
- Alle players worden nu gestopt bij `pause()` (net als bij stop)
- Bij resume: `handlePlay()` doet altijd `scheduleTimeline()` + `startActiveClips()` opnieuw

**Stop fix (`AudioService.ts`):**
- `transport.cancel()` vóór `transport.stop()` om lookahead buffer te wissen
- Force-stop alle players zonder state check

**Gewijzigde bestanden:**
- `src/hooks/useLocationAudio.ts` - cancelled flag in ambient useEffect
- `src/services/AudioService.ts` - pause() en stop() stoppen nu alle players

### 41. Soundscape Storytelling (Beeld bij Compositie)
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐⭐ Hoog
**Risico:** Medium-Hoog
**Geschatte tijd:** 5-8 dagen
**Bron:** Brainstorm educatieve features (2026-02-27)
**Afhankelijk van:** Scène-markering (#40)

**Beschrijving:**
Kinderen maken een soundtrack bij visuele scenes. Afbeeldingen of slides worden gekoppeld aan scènes op de timeline, zodat ze een soundscape componeren bij een verhaal. Dit verbindt muziek aan emotie en narratief.

Twee varianten:
1. **Stripverhaal-modus**: Reeks afbeeldingen als slides, elke slide gekoppeld aan een scène
2. **Achtergrond-modus**: Eén afbeelding als visuele context boven de timeline

**Te implementeren:**
- [ ] Image gallery panel in studio (tabbed interface of sidebar)
- [ ] `CompositionImage` type: `{ id, url, startBeat, endBeat, name }`
- [ ] Afbeeldingen koppelen aan scènes (#40)
- [ ] Afbeelding upload mechanisme (drag & drop of file input)
- [ ] Afbeelding opslag: Supabase Storage (localStorage te klein)
- [ ] Slide-weergave boven timeline, synchroon met playback
- [ ] Docent kan afbeeldingen meegeven in templates (#21)

**Technische uitdagingen:**
- **UI layout**: Huidige 3-panel layout (`h-dvh`) laat weinig ruimte voor afbeeldingen. Opties:
  - Tabbed interface: wisselen tussen "Samples" en "Beeld" tab
  - Collapsible panel boven timeline
  - Slides als overlay/modal tijdens playback
- **Opslag**: localStorage max 5MB, ongeschikt voor afbeeldingen → Supabase Storage nodig
- **Performance**: Grote afbeeldingen kunnen timeline-rendering vertragen
- **Compressie**: Client-side image resize/compress voor upload

**Risico's:**
- Layout-wijziging kan responsive design breken
- Supabase Storage is nieuw terrein (nog niet gebruikt in app)
- Scope creep: "afbeeldingen" kan veel richtingen op

### 27. Locatie Editor Verbeteringen (5.8)
**Status:** Basis werkend, verbeteringen optioneel
**Locatie:** `src/pages/LocationEditor.tsx`

**Wat al werkt:**
- [x] Upload achtergrondafbeelding (FileReader API)
- [x] Klik om hotspots te plaatsen (canvas click → modal)
- [x] Configureer hotspot grootte (radius)
- [x] Preview modus
- [x] Export als JSON (voor in codebase)

**Nog te doen:**
- [ ] Upload samples (MP3) direct koppelen
  - Nu: sample ID handmatig invoeren
  - Gewenst: MP3 uploaden → automatisch ID genereren
- [ ] Drag & drop hotspots verplaatsen
  - Nu: verwijderen + opnieuw plaatsen
  - Gewenst: sleep hotspot naar nieuwe positie

**Implementatie notities voor MP3 upload:**
- Samples moeten naar `/public/audio/themes/{themeId}/{locationId}/` gekopieerd worden
- Browser kan niet direct naar filesystem schrijven
- Optie 1: ZIP download met alle assets
- Optie 2: Copy-paste instructies met file paths

### 28. Eigen Samples Opnemen (5.5)
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐⭐ Hoog

**Te implementeren:**
- [ ] Microfoon permissie aanvragen (`navigator.mediaDevices.getUserMedia`)
- [ ] Real-time waveform visualisatie (canvas of Web Audio analyser)
- [ ] Max 5 seconden opname limiet
- [ ] Start/Stop recording controls
- [ ] Preview na opname
- [ ] Opslaan naar library met automatisch icoon (🎤)
- [ ] Encoding naar geschikt formaat (WAV of MP3)

**Technische uitdagingen:**
- Browser support voor MediaRecorder API
- Audio encoding (lamejs voor MP3, of native WAV)
- Waveform visualisatie performant maken
- Mobile microphone handling

**Aanbeveling:** Implementeer pas na core features stabiel zijn.

### 29. Digibord / Classroom Display Optimalisatie
**Status:** Kleine verbetering doorgevoerd (2026-02-04)
**Complexiteit:** ⭐ Laag
**Bron:** Docent feedback groep 6 (2026-02-03) - "Moest instellingen digibord aanpassen voor alle tracks"

**Analyse (2026-02-04):**
Na onderzoek blijkt de huidige weergave prima te werken. Alle 8 tracks zijn zichtbaar in de SubmissionPlayer modal. Waarschijnlijk was het originele probleem een eenmalige setup-issue (verkeerde resolutie, browser zoom, display mirroring).

**Kleine verbetering doorgevoerd:**
- [x] SubmissionPlayer modal vergroot: `max-w-6xl` → `max-w-7xl` (1152px → 1280px)

**Niet nodig bevonden:**
- Timeline scrollbaar maken - tracks passen prima
- Dynamische track hoogte - vaste hoogte is duidelijker
- Presentatiemodus - huidige modal is voldoende

**Locatie:** `src/components/teacher/SubmissionPlayer.tsx`

---

## 🟢 P4 - LAGE PRIORITEIT

### 30. Extra Locaties (5.1 vervolg)
**Status:** Gedeeltelijk - Klaslokaal (≈School) al geïmplementeerd

**Beschikbare locaties (5):**
- [x] Boerderij
- [x] Speeltuin
- [x] Gymzaal
- [x] Muziekwinkel
- [x] Klaslokaal (= "School" in originele todo)

**Nog te maken:**
- [ ] Spookhuis locatie
- [ ] Strand locatie
- [ ] Markt locatie
- [ ] Ruimtestation locatie

**Per locatie nodig:**
1. Achtergrond afbeelding (1920x1080 of 16:9)
2. 6 samples (MP3, ~2-4 seconden elk)
3. Hotspot configuratie (LocationEditor)
4. Vertaling keys (NL + EN)

### 31. Beat Ruler met Maatnummers ✅
**Status:** VOLTOOID (2026-02-27)
**Complexiteit:** ⭐ Laag
**Gerelateerd aan:** Playhead Scrubbing (#16)

**Beschrijving:**
Maatnummers (1-32) toegevoegd aan de ruler strip boven de timeline. Elke maatgrens (elke 4 beats) toont nu een subtiel nummer.

**Geïmplementeerd:**
- [x] Maatnummers (1-32) bij elke maatgrens-lijn in ruler
- [x] Responsive tekst grootte (8px mobile, 9px desktop)
- [x] Subtiele styling (`text-neutral-400`, `pointer-events-none`)
- [x] Playhead blijft volledig functioneel (nummers blokkeren niet)
- [x] Zichtbaar in zowel edit als read-only mode

**Gewijzigde bestanden:**
- `src/components/studio/Timeline.tsx` - `<span>` met maatnummer toegevoegd in ruler measure lines loop

### 42. Samenspel / Ensemble-modus
**Status:** 🔄 GEPARKEERD (conceptfase)
**Complexiteit:** ⭐⭐⭐⭐⭐ Zeer Hoog
**Risico:** Hoog
**Geschatte tijd:** 4-6 weken (als apart project)
**Bron:** Brainstorm educatieve features (2026-02-27)
**Vervangt:** Multiplayer (#32) — dit is een concrete, educatief onderbouwde variant

**Beschrijving:**
Meerdere kinderen werken op eigen device aan dezelfde compositie, elk op toegewezen tracks. Na individueel werken drukken ze op "Samenvoegen" en horen ze voor het eerst het totaal. Dit simuleert een echt ensemble: je moet ruimte laten en vertrouwen dat het geheel meer wordt dan de delen.

**Waarom zeer hoog:**
De hele app is single-user:
- Alle state is localStorage-based en lokaal
- Zustand stores gaan uit van één gebruiker
- AudioService is een singleton zonder netwerk-sync
- Geen real-time infrastructuur aanwezig

**Te implementeren (grote lijnen):**
- [ ] Real-time sync via Supabase Realtime (WebSocket)
- [ ] Server-side composition document model met versie-beheer
- [ ] Conflict resolution (twee kinderen plaatsen clip op zelfde beat)
- [ ] Session management (wie zit waar, welke tracks zijn van wie)
- [ ] Track-toewijzing per deelnemer (bijv. leerling A = track 1-2, leerling B = 3-4)
- [ ] "Samenvoegen" functie: combineer alle tracks tot één compositie
- [ ] Offline fallback voor lokale edits
- [ ] Audio playback sync over netwerk (moeilijk door latency)

**Open vragen (nog te brainstormen):**
- Werkt het met de huidige samples of zijn andere geluiden nodig?
- Hoe voorkom je out-of-sync plaatsingen? (bijv. A plaatst drum op beat 1, B op beat 1.5)
- Is het verrassingselement (pas horen bij samenvoegen) de kern, of willen we ook live meeluisteren?
- Alternatief: asynchrone samenwerking (geen realtime sync nodig, leerlingen werken om de beurt)

**Aanbeveling:**
Behandel als apart "Fase 2" project, niet als incrementele feature. Overweeg eerst een simpelere variant: asynchrone ensemble (leerling A maakt tracks 1-2, uploadt, leerling B downloadt en vult tracks 3-4 aan).

---

## ⚪ P5 - ZEER LAGE PRIORITEIT / PARKEREN

### 38. i18n Review (Terugkerend)
**Status:** Periodiek nalopen
**Complexiteit:** ⭐ Laag
**Gerelateerd aan:** i18n Audit (#35) ✅

**Beschrijving:**
Na elke grotere feature-implementatie controleren of alle nieuwe teksten vertaald zijn in zowel NL als EN. Dit voorkomt dat er geleidelijk weer hardcoded teksten insluipen.

**Checklist bij review:**
- [ ] Grep op hardcoded Nederlandse teksten in `src/components/` en `src/lib/`
- [ ] Vergelijk `nl.json` en `en.json` op ontbrekende keys (alle keys moeten in beide bestaan)
- [ ] Test app in EN modus: zijn er onvertaalde teksten zichtbaar?
- [ ] Nieuwe componenten: gebruiken ze `useTranslation()` + `t()` calls?

**Wanneer nalopen:**
- Na implementatie van elke P1/P2 feature
- Bij toevoeging van nieuwe componenten of schermen
- Bij toevoeging van nieuwe error handling

**Niet in scope:** LocationEditor.tsx (admin-only, ~25 strings), console.error berichten (developer-only)

---

### 43. Lesbrieven & Werkvormen (buiten de app)
**Status:** Niet begonnen
**Complexiteit:** ⭐ Laag (content-creatie, geen code)
**Risico:** Geen
**Geschatte tijd:** Doorlopend, parallel aan development
**Bron:** Brainstorm educatieve features (2026-02-27)

**Beschrijving:**
Lesbrieven met concrete werkvormen voor gebruik van SoundScout in de klas. Kan parallel aan alle development. Bevat didactische activiteiten die niet per se in de app hoeven maar de educatieve waarde enorm versterken.

**Te maken:**
- [ ] Lesbrief 1: Muzikale uitdagingen met beperkingen
  - "Gebruik maximaal 4 samples"
  - "Begin zacht en eindig luid"
  - "Combineer geluiden uit twee locaties"
  - "Maak een stuk van precies 8 maten"
- [ ] Lesbrief 2: Reflectie na het componeren
  - "Welk gevoel wilde je overbrengen?"
  - "Welk geluid is het belangrijkst?"
  - "Wat zou je anders doen?"
  - Peer feedback formulier
- [ ] Lesbrief 3: Luisteropdrachten
  - Actief luisteren naar elkaars composities
  - Instrumenten/geluiden herkennen
  - Emotie/sfeer beschrijven
- [ ] Lesbrief 4: Soundscape storytelling (zonder app-feature)
  - Verhaal voorlezen, kinderen maken soundtrack
  - Kan met bestaande app-functionaliteit
- [ ] Format: PDF of Word, met leerdoelen, tijdsindicatie, materiaallijst

**Doelgroepen:**
- Groep 3-4 (eenvoudige opdrachten, weinig tekst)
- Groep 5-6 (meer zelfstandig, complexere opdrachten)
- Groep 7-8 (reflectie, peer feedback, muzikale vorm)

### 44. Luister-en-Reageer Modus (Omgekeerd Spel)
**Status:** 🔄 GEPARKEERD (concept)
**Complexiteit:** ⭐⭐⭐⭐ Hoog
**Risico:** Medium
**Geschatte tijd:** 2-3 weken
**Bron:** Brainstorm educatieve features (2026-02-27)

**Beschrijving:**
Omgekeerde versie van het huidige spel: kinderen horen een geluid en moeten het op de juiste plek in de locatieplaat plaatsen (i.p.v. geluiden uit de locatie halen). Dit traint actief luisteren en auditieve herkenning.

**Waarom geparkeerd:**
Dit is een geheel nieuwe game-modus die de huidige locatie-flow fundamenteel verandert. De locatie-componenten (Hotspot, LocationScene) zijn gebouwd voor "klik = hoor geluid", niet voor "hoor geluid = sleep naar plek". Vereist nieuw interactiemodel.

**Concept:**
1. Kind komt op locatie
2. Geluid wordt afgespeeld (zonder visuele hint)
3. Kind sleept geluid-icoon naar juiste hotspot in de plaat
4. Correcte plaatsing: geluid wordt "verzameld"
5. Fout: visuele feedback, opnieuw proberen

**Aanbeveling:** Leuk idee voor toekomstige versie. Kan als aparte game-modus naast de huidige "verken & verzamel" modus.

### 33. Sample Effecten (5.4)
**Status:** Type definities voorbereid, geen UI/audio implementatie
**Gerelateerd aan:** Clip Trimming (P1 #12) - samen "Clip Editor" feature set

**Wat al bestaat:**
- [x] `ClipEffects` interface in `src/types/index.ts`
- [x] `DEFAULT_CLIP_EFFECTS` constante
- [x] `Clip.effects?` optional field

**Nog te implementeren:**
- [ ] Per-clip volume slider
- [ ] Pitch shift control
- [ ] Reverb wet/dry mix
- [ ] Pan (stereo position)
- [ ] Filter (low/high pass)
- [ ] UI controls per clip (expand/collapse panel)
- [ ] Tone.js effect nodes

**Aanbeveling:** Implementeer Clip Trimming (#12) eerst, dan eventueel effecten als uitbreiding.

---

## ❌ VERWIJDERD

Deze features worden NIET geïmplementeerd:

| Feature | Reden |
|---------|-------|
| Locked locaties (5.1) | Niet nodig, vrije toegang |
| Achievements & Badges (5.6) | Niet gewenst |
| Bulk afspelen (4.4) | Overkill |
| CSV export (4.4) | Overkill |
| Volume slider ambient (5.2) | Alleen aan/uit nodig |

---

## Architectuur Voorbereidingen (al gedaan)

Deze types/services zijn al voorbereid voor toekomstige implementatie:

| Item | Status | Voor feature |
|------|--------|--------------|
| `SavedComposition` type | ✅ | Lokaal opslaan |
| `SharedComposition` type | ✅ | Delen met link |
| `StorageService` | ✅ | Lokaal opslaan |
| `UserRole`, `UserSession` | ✅ | Klas-code systeem |
| `useUserStore` | ✅ | Klas-code systeem |
| `ClipEffects` type | ✅ | Sample effecten |
| `GameScreen` met 'map' | ✅ | Stadskaart |
| `Location.ambientAudio` | ✅ | Ambient audio |
| Theme system | ✅ | Thema pakketten |
| RLS policies | ✅ | Database security |
| `loadTimeline()` | ✅ | Template systeem |
| `ThemeSelectionModal` patroon | ✅ | Template/scène selectie UI |
| `ClipEffects.volume` | ✅ | Volume per track (type basis) |

---

## Volgende Stappen

### ✅ Voltooid (1-24)
1. ~~Locaties & Stadskaart~~ ✅
2. ~~MP3 Export~~ ✅
3. ~~Lokaal Opslaan + Beheren~~ ✅
4. ~~Responsive Design~~ ✅
5. ~~Studio Layout (8 tracks)~~ ✅
6. ~~Nieuwe Locaties Assets~~ ✅
7. ~~Design System & Styling~~ ✅
8. ~~Teacher Dashboard~~ ✅
9. ~~StartScreen Branding~~ ✅
10. ~~Klas-code Systeem~~ ✅
11. ~~Hotspot Animaties~~ ✅
12. ~~Clip Trimming & Smart Snap~~ ✅
13. ~~Audio Loading Robuuster~~ ✅
14. ~~Ambient Audio~~ ✅
15. ~~Drag Offset Alignment~~ ✅
16. ~~Playhead Seeking~~ ✅
17. ~~Vereenvoudigde Transport Controls~~ ✅
18. ~~Getrimde Clip Kopiëren/Dupliceren~~ ✅
19. ~~Getrimde Clip Visuele Lengte bij Drag~~ ✅
20. ~~Emergency/Feedback Systeem~~ ✅
21. ~~Beat Ruler met Maatnummers~~ ✅
22. ~~Delen met Link~~ ✅
23. ~~i18n Audit~~ ✅
24. ~~Playhead Seeking Docenten Viewer~~ ✅

### 🔴 Nu: P1 — Features voltooid, technische basis versterken

**Alle P1 feature-items voltooid!** 🎉

**Volgende stap: Technische schuld aanpakken vóór nieuwe features:**

Week 1 — Kritieke veiligheid + quick wins:
- TP0-1: `CompositionData` interface (vervangt alle `any`)
- TP0-2: Rate limiting op submissions
- TP0-3: CHECK constraints op Supabase
- TP0-4: max_classes enforcement in DB
- TP1-2: Ambient audio fade timeout fix

Week 2 — Architectuur stabiliteit:
- TP1-1: StageView.tsx split (506 → 4 bestanden)
- TP1-5: Orchestratie-functie compositie-initialisatie
- TP2-1: gameStore → appStore migratie

Week 3 — Robuustheid:
- TP1-3: Error handling async hooks
- TP1-4: Feature-level Error Boundaries
- TP2-2: libraryStore redundante state

### 🟠 Daarna: P2 (educatieve features + bestaand)
- ~~Thema Selectie Modal (#13)~~ ✅
- ~~Delen met Link (#14)~~ ✅
- ~~Emergency/Feedback Systeem (#15)~~ ✅
- Touch Gevoeligheid & Autoplay Issues (#16)
- **Template Systeem voor Docenten (#21)** ← geüpgraded van P3 (voorwaarde: TP1-5 orchestratie)
- Real-time Geluiden Toevoegen tijdens Afspelen (#22)
- ~~Tweetalig Systeem Grondig Implementeren (#35)~~ ✅
- ~~Playhead Seeking in Docenten Compositie Viewer (#36)~~ ✅
- ~~Grijs Leeg Gedeelte onder Timeline Tracks Verwijderen (#37)~~ ✅
- **Volume per Track / Mixer (#39)** ← nieuw (voorwaarde: TP0-1 types, combineer met TP2-6 parameter bloat)
- **Scène-markering op Timeline (#40)** ← nieuw

Aanbevolen volgorde P2: Templates (#21) → Scènes (#40) → Volume (#39)

### 🟡 Later: P3
- ~~Ambient Audio Cleanup & Pause/Stop Fix (#26)~~ ✅
- Eigen Samples Opnemen (#28)
- Digibord/Classroom Display Optimalisatie (#29)
- ~~Sample Wis Knop UI Aanpassen (#34)~~ ✅
- **Soundscape Storytelling (#41)** ← nieuw (afhankelijk van #40)

### 🟢 Toekomst: P4
- Extra Locaties (#30)
- ~~Beat Ruler met Maatnummers (#31)~~ ✅
- Locatie Editor Verbeteringen (#27)
- **Samenspel / Ensemble-modus (#42)** ← vervangt Multiplayer (#32)
- TP4 technische items (AudioService split, factory pattern, test suites)

### ⚪ Backlog: P5
- i18n Review — terugkerend (#38)
- Sample Effecten (#33)
- **Lesbrieven & Werkvormen (#43)** ← nieuw, parallel aan development
- **Luister-en-Reageer Modus (#44)** ← nieuw, geparkeerd
