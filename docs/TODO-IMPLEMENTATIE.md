# SoundScout - Implementatie Todo's

**Laatst bijgewerkt**: 2026-02-04 (Drag Offset Alignment #16 voltooid)
**Gebaseerd op**: PRD Fase 4 & 5, gebruiker feedback

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

## 🔴 P1 - HOOGSTE PRIORITEIT (nu)

*Geen P1 items - alle hoge prioriteit features zijn voltooid*

---

## 🟠 P2 - HOGE PRIORITEIT

### 13. Thema Dropdown in UI (5.9)
**Status:** Architectuur gereed, alleen UI mist
**Complexiteit:** ⭐ Laag (1-2 uur)

**Wat al werkt:**
- [x] URL parameter `?theme=xxx` volledig functioneel
- [x] Theme config structuur in `src/data/themes/`
- [x] 2 themes beschikbaar: `basis`, `test-metro`
- [x] `getPublicThemes()` functie geëxporteerd
- [x] Documentatie: `docs/NIEUWE-LOCATIE-THEMA.md`

**Nog te doen:**
- [ ] Dropdown/selector toevoegen aan StartScreen
- [ ] Gebruik `getPublicThemes()` voor opties
- [ ] URL parameter updaten bij selectie
- [ ] Huidige theme highlighten in dropdown

**Implementatie notities:**
- `getPublicThemes()` retourneert array van `{ id, name }` objecten
- Dropdown kan verborgen blijven als er maar 1 theme is
- Overweeg: radio buttons i.p.v. dropdown voor betere mobile UX

### 14. Delen met Link (4.3)
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐ Medium-Hoog
**Vereist:** Supabase (al geconfigureerd)

**Belangrijk:** Dit is ANDERS dan "Deel met Docent" (wat al werkt). Dit is voor publieke links die iedereen kan openen.

**Te implementeren:**
- [ ] `shares` tabel in Supabase aanmaken
- [ ] Share code generatie (bijv. `PARK-7X3K`)
- [ ] "Deel" knop in Stage-scherm naast "Download MP3"
- [ ] Modal met gegenereerde link + kopieer knop
- [ ] Publieke luisterpagina (`/luister/:shareCode` of query param)
- [ ] Read-only compositie player (hergebruik SubmissionPlayer logica)
- [ ] Link verloopt na 30 dagen (of configureerbaar)

**Database schema:**
```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(8) UNIQUE NOT NULL,
  composition_data JSONB NOT NULL,
  composition_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INT DEFAULT 0
);
```

**Privacy overwegingen:**
- Geen account nodig om te luisteren
- Compositie data wordt gekopieerd (niet gelinkt aan gebruiker)
- Automatische cleanup van verlopen shares (cron of on-access check)

### 15. Emergency Knop bij Foutmeldingen
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐ Medium
**Bron:** Gebruiker feedback (2026-02-03)

**Beschrijving:**
Wanneer er een foutmelding optreedt (audio laadt niet, netwerk error, etc.) moet er een duidelijke "noodknop" zijn waarmee gebruikers terug kunnen naar een werkende staat.

**Te implementeren:**
- [ ] Globale error boundary component
- [ ] "Opnieuw proberen" knop bij laadfouten
- [ ] "Terug naar start" emergency knop bij kritieke fouten
- [ ] Duidelijke foutmeldingen in gebruikersvriendelijke taal
- [ ] Logging van errors voor debugging
- [ ] Graceful degradation bij gedeeltelijke failures

**UI/UX:**
- Rode/oranje waarschuwingskleur voor error states
- Grote, duidelijk zichtbare knoppen
- Korte, begrijpelijke foutmeldingen (geen technische jargon)
- Optie om "door te gaan" waar mogelijk

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

---

## 🟡 P3 - MEDIUM PRIORITEIT

### 18. Locatie Editor Verbeteringen (5.8)
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

### 19. Eigen Samples Opnemen (5.5)
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

### 20. Digibord / Classroom Display Optimalisatie
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐ Medium
**Bron:** Docent feedback groep 6 (2026-02-03) - "Moest instellingen digibord aanpassen voor alle tracks"

**Probleem:**
Op digiborden (interactieve schoolborden) zijn niet altijd alle 8 tracks zichtbaar. Docent moest display instellingen aanpassen.

**Mogelijke oorzaken:**
- Digiborden hebben vaak 4:3 of 16:10 aspect ratio (niet 16:9)
- Timeline is geoptimaliseerd voor desktop/tablet, niet voor widescreen classroom displays
- 8 tracks passen mogelijk niet in viewport

**Te onderzoeken:**
- [ ] Test op verschillende aspect ratios (4:3, 16:10, 21:9)
- [ ] Test op groot scherm (1920x1080+)
- [ ] Check of alle tracks zichtbaar zijn in Teacher Dashboard

**Mogelijke oplossingen:**
- [ ] Timeline scrollbaar maken als tracks niet passen
- [ ] Compacte track weergave optie voor grote schermen
- [ ] Auto-detect aspect ratio en layout aanpassen
- [ ] "Presentatiemodus" met optimale weergave voor digibord

**Notitie:** Digiborden worden vaak via HDMI/VGA aangesloten aan laptop. Resolutie kan afwijken van laptop scherm.

---

## 🟢 P4 - LAGE PRIORITEIT

### 21. Extra Locaties (5.1 vervolg)
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

### 22. Beat Ruler met Cijfers
**Status:** Niet begonnen
**Complexiteit:** ⭐ Laag
**Gerelateerd aan:** Playhead Scrubbing (#16)

**Beschrijving:**
De ruler strip boven de timeline toont momenteel alleen maatgrens-lijnen (elke 4 beats). Een toekomstige verbetering is het toevoegen van beat/maat cijfers.

**Te implementeren:**
- [ ] Beat nummers tonen in ruler (1, 2, 3, 4 of maatnummers)
- [ ] Responsive tekst grootte (kleiner op mobile)
- [ ] Alleen major beats labelen (elke 4 of elke 8)

**Locatie:** `src/components/studio/Timeline.tsx` - ruler strip sectie

**Notitie:** Ruler strip infrastructuur is al aanwezig door Playhead Scrubbing implementatie.

### 23. Multiplayer (5.7)
**Status:** 🔄 GEPARKEERD
**Complexiteit:** ⭐⭐⭐⭐⭐ Zeer hoog

- [ ] Real-time samenwerken
- [ ] Room systeem
- [ ] Chat/emoji

**Technisch:** Vereist WebSocket server (Supabase Realtime of eigen backend). Significante architectuur wijzigingen nodig.

**Aanbeveling:** Alleen overwegen als er concrete vraag naar is.

---

## ⚪ P5 - ZEER LAGE PRIORITEIT / PARKEREN

### 23. Sample Effecten (5.4)
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

---

## Volgende Stappen

### ✅ Voltooid (1-15)
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

### 🔴 Nu: P1
*Geen P1 items - alle hoge prioriteit features zijn voltooid*

### 🟠 Daarna: P2
- Thema Dropdown in UI (#13)
- Delen met Link (#14)
- Emergency Knop bij Foutmeldingen (#15)
- Touch Gevoeligheid & Autoplay Issues (#16)

### 🟡 Later: P3
- Locatie Editor Verbeteringen (#18)
- Eigen Samples Opnemen (#19)
- Digibord/Classroom Display Optimalisatie (#20)

### 🟢 Toekomst: P4
- Extra Locaties (#21)
- Multiplayer (#22)

### ⚪ Backlog: P5
- Sample Effecten (#23)
