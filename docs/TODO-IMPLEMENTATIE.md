# SoundScout - Implementatie Todo's

**Laatst bijgewerkt**: 2026-02-03
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

---

## 🔴 P1 - HOOGSTE PRIORITEIT (nu)

### 12. Clip Trimming / Inkorten
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐⭐ Medium (4-6 uur)
**Feedback:** Gebruikersverzoek (2026-02-03) - studenten willen samples inkorten op timeline

**Beschrijving:**
Gebruikers kunnen clips op de timeline inkorten door aan de linker- of rechterkant van de clip te slepen met een resize handle. Dit maakt het mogelijk om alleen een deel van een sample te gebruiken.

**Technische implementatie:**
- [ ] Clip type uitbreiden met `trimStart` en `trimEnd` (in beats of seconden)
- [ ] Resize handles toevoegen aan Clip component (links + rechts)
- [ ] Drag-to-resize logica implementeren (naast bestaande drag-to-move)
- [ ] Visuele breedte berekening aanpassen voor getrimde clips
- [ ] Tone.js scheduling aanpassen: `player.start(time, offset, duration)`
- [ ] Minimum clip lengte afdwingen (bijv. 0.5 beat)
- [ ] SavedComposition/SharedComposition types updaten voor trim data

**UI/UX:**
- Handles alleen zichtbaar bij hover (desktop) of altijd op mobile
- Cursor verandert naar `ew-resize` bij hover op handles
- Visuele feedback tijdens resize (clip past mee)
- Waveform (indien aanwezig) past mee met trim

**Belangrijke overwegingen:**
- dnd-kit wordt al gebruikt voor clip verplaatsing - resize moet hier goed mee samenwerken
- Mogelijk aparte drag handler nodig (niet via dnd-kit maar eigen mouse/touch events)
- Audio offset berekening: `trimStart` in seconden → Tone.js offset parameter

**Combineren met:**
- Kan standalone geïmplementeerd worden
- Optioneel later uitbreiden met Sample Effecten (P5) voor een "Clip Editor" feature set

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

### 15. Audio Loading Robuuster Maken
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐ Medium
**Bron:** Docent feedback groep 6 (2026-02-03) - "Niet alle geluiden werkten bij iedereen"

**Probleem:**
Bij klasgebruik laden niet altijd alle samples correct. Mogelijk oorzaken:
- Schoolnetwerk traag/instabiel
- Veel gelijktijdige gebruikers
- Geen retry bij timeout
- Geen duidelijke feedback bij laadfouten

**Te implementeren:**
- [ ] Retry mechanisme bij laden (3x met exponential backoff)
- [ ] Per-sample loading indicator (niet alleen globale spinner)
- [ ] Duidelijke error feedback als sample niet laadt ("Geluid kon niet laden, tik om opnieuw te proberen")
- [ ] Preloading strategie verbeteren (prioriteit: huidige locatie eerst)
- [ ] Offline detectie + melding
- [ ] Cache headers optimaliseren voor herhaald bezoek

**Technische aanpak:**
```typescript
// In useLocationAudio.ts of AudioService
const loadWithRetry = async (url: string, retries = 3): Promise<Tone.Player> => {
  for (let i = 0; i < retries; i++) {
    try {
      const player = new Tone.Player(url).toDestination();
      await player.load(url);
      return player;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
};
```

**Test scenario's:**
- [ ] Test met trage netwerk simulatie (Chrome DevTools → Network → Slow 3G)
- [ ] Test met 20+ gelijktijdige gebruikers
- [ ] Test met intermitterende connectie

### 16. Drag-and-Drop UX Verbetering
**Status:** Niet begonnen
**Complexiteit:** ⭐⭐ Medium
**Bron:** Docent feedback groep 6 (2026-02-03) - "Samples konden ineens verspringen"

**Probleem:**
Bij het slepen van clips op de timeline "verspringen" ze soms onverwacht. Dit is frustrerend voor kinderen en maakt nauwkeurig werken lastig.

**Mogelijke oorzaken:**
- Snap-to-beat te agressief
- Touch sensitivity te hoog op tablets/Chromebooks
- Drag threshold te laag
- Conflict tussen drag-to-move en andere touch events

**Te onderzoeken:**
- [ ] Test op verschillende devices (tablet, Chromebook, desktop)
- [ ] Log drag events om patroon te vinden
- [ ] Check dnd-kit configuratie (PointerSensor distance, TouchSensor delay)

**Mogelijke oplossingen:**
- [ ] Verhoog drag threshold (nu 8px, mogelijk 12-16px)
- [ ] Voeg "drag preview" toe die duidelijker laat zien waar clip komt
- [ ] Visuele snap indicator (grid highlight tijdens drag)
- [ ] TouchSensor delay verhogen voor tablets
- [ ] Optioneel: "Fijn positioneren" modus zonder snap

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

### 17. Locatie Editor Verbeteringen (5.8)
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

### 18. Ambient Audio (5.2)
**Status:** Architectuur voorbereid, geen implementatie
**Complexiteit:** ⭐⭐ Medium

**Wat al bestaat:**
- [x] `ambientAudio: string` veld in Location interface
- [x] Alle locaties hebben het veld (momenteel leeg: `''`)

**Te implementeren:**
- [ ] Ambient audio files toevoegen per locatie
- [ ] Audio playback starten bij betreden locatie (`LocationScene` mount)
- [ ] Fade in effect (0.5-1s)
- [ ] Fade out bij verlaten locatie (cleanup)
- [ ] **Toggle in StartScreen**: "Achtergrondmuziek aan/uit"
- [ ] Voorkeur opslaan in localStorage
- [ ] Loop ambient track continu

**Technische aanpak:**
```typescript
// In LocationScene.tsx of nieuwe useAmbientAudio hook
useEffect(() => {
  if (!location.ambientAudio || !ambientEnabled) return;

  const player = new Tone.Player(location.ambientAudio).toDestination();
  player.loop = true;
  player.volume.value = -10; // Zachter dan samples

  // Fade in
  player.volume.value = -Infinity;
  player.start();
  player.volume.rampTo(-10, 0.5);

  return () => {
    // Fade out
    player.volume.rampTo(-Infinity, 0.3);
    setTimeout(() => player.dispose(), 300);
  };
}, [location.ambientAudio, ambientEnabled]);
```

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

### 22. Multiplayer (5.7)
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

### ✅ Voltooid (1-11)
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

### 🔴 Nu: P1
12. **Clip Trimming** - Studenten willen samples inkorten

### 🟠 Daarna: P2
13. Thema Dropdown in UI
14. Delen met Link (publieke luisterlinks)
15. Audio Loading Robuuster (docent feedback: geluiden laden niet altijd)
16. Drag-and-Drop UX Fix (docent feedback: samples verspringen)

### 🟡 Later: P3
17. Locatie Editor Verbeteringen
18. Ambient Audio
19. Eigen Samples Opnemen
20. Digibord/Classroom Display Optimalisatie

### 🟢 Toekomst: P4
21. Extra Locaties (Spookhuis, Strand, etc.)
22. Multiplayer (geparkeerd)

### ⚪ Backlog: P5
23. Sample Effecten (volume, pitch, reverb)
