# PRD — Opname-Praatplaat (Audio Recording op Beeld)

**Status:** Brainstorm actief · **Versie:** 0.2 (2026-04-13) · **Auteur:** B + Claude
**Gerelateerd:** #28 (microfoon-opname), #72 (praatplaat), #44 (luister-en-plaats)

> Tijdelijke, lichtgewicht variant op de bestaande praatplaat: in plaats van dat de
> leerling een compositie maakt in de studio, neemt hij/zij één kort geluid op
> (± 15 s) met de microfoon van de telefoon/tablet en plaatst dat anoniem op een
> plek van de praatplaat. De docent speelt de opnames af op het digibord.

---

## 1. Productvisie & scope

### 1.1 Kernidee in één zin
Een leerling tikt op een plek in de praatplaat, neemt daar met de microfoon een kort geluid op (max. 15 s), dient dit anoniem + eenmalig in, en de docent speelt alle bijdragen klassikaal af.

### 1.2 Pedagogisch rationale
- Drempelverlaging t.o.v. volledige studio-compositie: de leerling hoeft nog niet met beats/timeline te werken.
- Verbindt *lichamelijk* geluid-maken (stem, voorwerpen, omgeving) aan een visuele plek.
- Past in de lesflow: "Hoe zou de koe hier klinken? Doe het zelf na en plak het op de koe."
- Voorbereiding op #44 (luister-en-plaats) en #28 (eigen samples in studio) — deze feature is effectief een *beperktere* versie daarvan en kan als stepping stone dienen.

### 1.3 Expliciet niet-doelen (versie 1)
- Geen bewerking van het geluid (geen trim/fade/effects).
- Geen gekoppelde identiteit (volledig anoniem, geen student_name input).
- Geen meerdere opnames per leerling op dezelfde praatplaat.
- Geen real-time collaboratie; docent ziet pas bij refresh / na indienen.
- Geen moderatie-workflow voor ongepaste opnames (zie §8 Risico's).

### 1.4 Versie-fasering
| Versie | Scope |
|---|---|
| **v1 (MVP)** | Opnemen, heropnemen, plaatsen, eenmalig indienen, docent speelt af in viewer. Max 15 s. |
| **v2** | Docent kan opname-duur per praatplaat verhogen (bv. 30/45/60 s). Docent kan individuele opname resetten/verwijderen. |
| **v3** | "Docent-studio": opnames verschijnen als samples in een studio-sessie; docent plaatst ze op een timeline en exporteert als één compositie (zie §9). |
| **Later** | Eventueel: opname ook als sample in de gewone leerling-studio (convergentie met #28). |

---

## 2. Jouw open vraag: opnames ook in de bestaande praatplaat?

> *"Wat als we in de toekomst het willen combineren? Dus in de huidige praatplaat
> functies ook geluiden willen toevoegen? Of laten we dat dan de leerlingen gewoon
> doen in hun studio en verandert er daardoor niets in de huidige praatplaat
> functie omdat de geluiden op een andere plek worden bewaard?"*

### Mijn eerlijke analyse

Er zijn drie pragmatische scenario's, met duidelijke voor- en nadelen:

**A. Twee gescheiden praatplaat-types (aanbevolen voor nu).**
Een nieuw veld `praatplaat_type` op `praatplaten` met waarden `'compositie'` (huidige) en `'opname'` (nieuwe). Per praatplaat kiest de docent één van de twee bij aanmaken. Submissions onderscheiden zich via `recording_url IS NULL` of niet.
- Voordeel: Bestaande viewer/flow blijft 100% hetzelfde. Geen regressie-risico.
- Voordeel: UI voor de leerling blijft simpel — een opname-praatplaat heeft géén "kies studio of opname" keuze, het staat vast.
- Voordeel: Data-model blijft opvraagbaar: "geef me alle opname-bijdragen" is één `WHERE`.
- Nadeel: Je kunt per praatplaat niet mixen. Eén klas = één type per praatplaat.

**B. Hybride praatplaat: leerling kiest per spot.**
Zelfde praatplaat, leerling kiest "compositie maken" of "opname doen". Submissions krijgen óf `composition_data` óf `recording_url`.
- Voordeel: Maximaal flexibel — in één les kan klas-A composities maken en klas-B opnames.
- Nadeel: UI-keuze bij elke leerling verhoogt faalkans ("ik wist niet wat ik moest kiezen"). Kinderen in groep 4-5 willen juist één duidelijke taak.
- Nadeel: `PraatplaatSpot` icon moet op type onderscheiden; viewer-mengeling kan verwarrend zijn ("waarom zijn sommige 30s en andere 5s?").
- Nadeel: Retrofit van bestaande submissions lastig (geen type-kolom).

**C. Opnames blijven altijd buiten de praatplaat.**
Opnemen zit alleen in de studio (#28), als extra samplebron naast locatiegeluiden. De praatplaat blijft puur voor composities.
- Voordeel: Zuivere scheiding, één opname kan in meerdere composities hergebruikt worden.
- Nadeel: Verliest exact het laagdrempelige karakter dat jouw idee aantrekkelijk maakt ("zonder studio, direct op beeld"). Voor jonge kinderen is de studio een barrière.
- Nadeel: Jouw oorspronkelijke pedagogische doel (direct geluid-op-plek zonder tussenstap) gaat verloren.

### Mijn advies

**Begin met A. Houd de deur expliciet open voor latere migratie naar B.**

Concreet betekent dat:
1. We ontwerpen de kolom `recording_url TEXT NULL` op `submissions` (niet in `composition_data` stoppen).
2. Bij aanmaken van een praatplaat voegen we `type TEXT NOT NULL DEFAULT 'compositie'` toe — bestaande rows krijgen automatisch `'compositie'`.
3. De RPC's `submit_praatplaat_composition` en `submit_praatplaat_recording` zijn gescheiden, maar schrijven naar dezelfde `submissions`-tabel.
4. De viewer leest `type` en rendert of `SubmissionPlayer` (compositie) of een simpele `<audio>` (opname).

Als we ooit naar B willen: `type` kan een derde waarde `'hybride'` krijgen en de submit-RPC's beslissen welk veld verplicht is. Geen tabel-migratie nodig, alleen extra RPC-logica. Dat is een lage prijs voor veel optionaliteit.

**Antwoord op jouw kernvraag:** de geluiden worden in dit ontwerp *op een andere plek* bewaard (namelijk `recording_url` i.p.v. `composition_data`), dus aan de bestaande praatplaat-functie verandert niets. Zowel oude als nieuwe praatplaten draaien parallel, zonder regressie-risico.

---

## 3. User flows

### 3.1 Docent — aanmaken opname-praatplaat
1. Dashboard → klas → sectie "Praatplaten" → knop **"Nieuwe praatplaat"**
2. Modal met extra keuze bovenaan: **"Type"** (toggle: `Compositie` / `Opname`)
   - Bij keuze `Opname`: extra instellingen zichtbaar:
     - "Maximale opname-duur" (v1: altijd 15s, disabled; v2: dropdown 15/30/45/60).
     - **"Meerdere plekken per leerling"** (toggle, standaard uit). Aan = leerling mag na indienen nog een positie kiezen en opnieuw opnemen. Uit = eenmalig indienen.
3. Naam + locatie-afbeelding kiezen → opslaan.
4. Praatplaat verschijnt in grid met badge `Opname` (blauw) i.p.v. `Compositie` (amber).
5. Activeren werkt identiek; één actieve per klas blijft de regel.

### 3.2 Leerling — opname-flow
1. Klascode invoeren in `ShareCodeInput` (bestaand).
2. `getActivePraatplaat()` detecteert `type === 'opname'` → device-check (`isRecordingSupported()`). Bij geen ondersteuning: foutmelding + stop. Anders: route naar **`recording-praatplaat`** screen (nieuw).
3. Leerling ziet de praatplaat-afbeelding fullscreen met instructie: "Tik op de plek waar je een geluid wilt maken."
4. Tik op beeld → positie marker verschijnt (x,y normalized 0-1). Optioneel naamveld (niet verplicht). Bevestigknop.
5. Na bevestiging: navigatie naar het **opname-scherm**. Dit is een standaard volledig scherm (geen overlay, geen inschuif-paneel) met:
   - Boven: compacte weergave van de praatplaat met de gekozen positie-marker (context voor de leerling: "hier maak ik geluid voor").
   - Midden: **`RecordingPanel`** — universeel, herbruikbaar component (zie §5.4):
     - Grote rode ronde opnameknop (minimaal 64px, touch-friendly).
     - Timer 0:00 → max duur. Automatisch stop bij limiet.
     - Tijdens opname: waveform-meter (Web Audio AnalyserNode).
   - Het `RecordingPanel` is zelfstandig en weet niets van praatplaten — het ontvangt `maxDuration` en levert een `Blob` op.
6. Na opname (preview-staat in `RecordingPanel`):
   - Afspeelknop (play/pause toggle) met waveform-visualisatie.
   - Knop **"Opnieuw opnemen"** (bevestig-dialog: "Je huidige opname wordt verwijderd").
   - Knop **"Andere plek kiezen"** → terug naar positie-scherm, opname wordt weggegooid.
   - Knop **"Indienen"** (primary).
7. Bij indienen:
   - Upload naar Supabase Storage → returned path.
   - RPC `submit_praatplaat_recording(class_code, praatplaat_id, x, y, storage_path, duration_ms)` → inserts submission.
   - localStorage: `soundscout:recording-submitted:{praatplaat_id}` = `true` (als meerdere plekken uit staat).
   - Eenvoudig success-scherm: checkmark-icoon + tekst "Jouw geluid is ingestuurd" + terug-knop. Geen animaties.
8. **Als "meerdere plekken" aan staat:** na indienen verschijnt een keuze: "Nog een geluid opnemen?" (→ terug naar positie-scherm) of "Klaar" (→ terug naar start).
9. **Als "meerdere plekken" uit staat:** bij heropenen met dezelfde klascode: localStorage-flag gecheckt → scherm toont "Je hebt al een geluid ingestuurd" met terug-knop. (Zachte lock — bewust omzeilbaar in incognito.)

### 3.3 Docent — presenteren (viewer)
1. Dashboard → klik op praatplaat-card → `PraatplaatViewer` opent fullscreen.
2. Viewer detecteert `type === 'opname'` en laadt via nieuwe RPC `get_praatplaat_recordings()` die signed URLs retourneert (geldig 1 uur).
3. Afbeelding is maximaal — geen extra UI-elementen behalve de spots en de header-balk (naam + refresh + sluiten).
4. **Spot-interactie (toggle-gedrag):**
   - Tik op spot-icoon (microfoon) → opname speelt af. Icoon pulseert subtiel tijdens afspelen.
   - Tik opnieuw op hetzelfde icoon → opname stopt.
   - Tik op een ander icoon terwijl er iets speelt → huidige stopt, nieuwe start.
   - Geen afspeel-balk onderin het scherm. De spot zelf is de knop.
5. **Cluster met meerdere opnames:** bij tik op een geclusterde spot verschijnt een compacte dropdown met namen/labels. Klik op een item = afspelen (zelfde toggle-gedrag).
6. **Optionele detail-view:** docent kan (via long-press of context-knop op spot) een detail-overlay openen met: naam leerling, opname-duur, afspeelknop, en (v2) verwijder-knop. Vergelijkbaar met hoe bij compositie-praatplaten de studio-view geopend kan worden.
7. Refresh-knop in header haalt nieuwe opnames op (+ ververst signed URLs).

---

## 4. Data-model

### 4.1 Migratie `012_recording_praatplaten.sql`

```sql
-- 1. Praatplaten krijgen een type
ALTER TABLE public.praatplaten
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'compositie'
    CHECK (type IN ('compositie', 'opname')),
  ADD COLUMN IF NOT EXISTS max_recording_seconds INT NOT NULL DEFAULT 15
    CHECK (max_recording_seconds BETWEEN 5 AND 120),
  ADD COLUMN IF NOT EXISTS allow_multiple_spots BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Submissions krijgen opname-velden (naast bestaande praatplaat-kolommen)
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS recording_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS recording_duration_ms INT NULL
    CHECK (recording_duration_ms IS NULL OR recording_duration_ms BETWEEN 500 AND 120000),
  ADD COLUMN IF NOT EXISTS recording_mime TEXT NULL;

-- Constraint: óf composition_data óf recording_path (XOR via CHECK)
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_content_xor CHECK (
    (composition_data IS NOT NULL AND recording_path IS NULL) OR
    (composition_data IS NULL AND recording_path IS NOT NULL) OR
    -- Legacy: beide null toegestaan voor oude bewaarcode-rows
    (composition_data IS NULL AND recording_path IS NULL)
  );
```
> ⚠ **Risico bij XOR-constraint:** de bestaande tabel heeft momenteel `composition_data` op sommige rows als NULL (bewaarcodes zonder submit). Check eerst in productie of deze constraint niet breekt. Zo nodig: een soepelere variant zonder XOR.

### 4.2 Supabase Storage bucket

```
Bucket: praatplaat-recordings
Access: private
Structure: {teacher_id}/{praatplaat_id}/{submission_id}.webm
```

**RLS policies op `storage.objects`:**
- SELECT: alleen via signed URLs (geen directe GET).
- INSERT: `anon` mag in pad `{teacher_id}/{praatplaat_id}/*` mits praatplaat actief + type='opname' + rate-limit. Wordt afgehandeld in RPC, niet direct door client.
- DELETE: alleen `authenticated` en path-prefix moet `auth.uid()` zijn (docent eigen opnames).

**Belangrijker:** client uploadt *niet* direct naar Storage met anon-key (te riskant — ongecontroleerde uploads). In plaats daarvan:

1. Client roept RPC `request_recording_upload_url(class_code, praatplaat_id)` aan.
   - Server valideert klascode + praatplaat + rate-limit.
   - Server genereert submission_id en een **signed upload URL** (Storage API `createSignedUploadUrl`) voor pad `{teacher_id}/{praatplaat_id}/{submission_id}.webm`, geldig 5 minuten.
   - Returns `{ submission_id, upload_url, upload_token }`.
2. Client doet PUT naar `upload_url` met de audio-blob.
3. Client roept RPC `finalize_recording_submission(submission_id, class_code, praatplaat_id, x, y, duration_ms, mime)` aan.
   - Server verifieert dat bestand daadwerkelijk in bucket staat (eventueel `supabase.storage.from(...).list()` check).
   - Server inserteert submission-row.

Dit patroon volgt hetzelfde security-filosofie als `save_secret` bij #52: rate-limit en ownership-check server-side, client krijgt een kortgeldige capability token.

### 4.3 RPC signatures

```sql
-- Leerling: vraag upload-URL aan
CREATE FUNCTION request_recording_upload_url(
  p_class_code TEXT,
  p_praatplaat_id UUID
) RETURNS TABLE (submission_id UUID, upload_url TEXT)
-- Rate limit: 10/min per klascode (opname-specifiek, losstaand van submit)

-- Leerling: finaliseer na upload
CREATE FUNCTION finalize_recording_submission(
  p_submission_id UUID,
  p_class_code TEXT,
  p_praatplaat_id UUID,
  p_position_x REAL,
  p_position_y REAL,
  p_duration_ms INT,
  p_mime TEXT
) RETURNS BOOLEAN

-- Docent: haal opnames op met signed URLs
CREATE FUNCTION get_praatplaat_recordings(
  p_praatplaat_id UUID,
  p_class_id UUID
) RETURNS TABLE (
  id UUID,
  position_x REAL,
  position_y REAL,
  duration_ms INT,
  signed_url TEXT, -- 1 uur geldig
  created_at TIMESTAMPTZ
)

-- Docent (v2): verwijder individuele opname
CREATE FUNCTION delete_recording_submission(p_submission_id UUID) RETURNS BOOLEAN
-- Verwijdert row én storage object
```

### 4.4 Lifecycle / cleanup
- Bij `delete_praatplaat`: submissions blijven staan (praatplaat_id → NULL), maar storage-objecten worden **wel** verwijderd om storage-kosten te beperken. Gebruik een `BEFORE DELETE` trigger of expliciete cleanup-stap in RPC.
- Cron/edge-function (toekomstig): opnames > 90 dagen zonder klas-activiteit kunnen geauditeerd/verwijderd worden (vergelijkbaar met #52 60-dagen policy).

---

## 5. Frontend-architectuur

### 5.1 Nieuwe bestanden

```
src/
├── components/recording/
│   └── RecordingPanel.tsx                 # UNIVERSEEL opname-component (zie §5.4)
├── components/praatplaat/recording/
│   ├── RecordingPraatplaatScreen.tsx      # Leerling-flow (root, schakelt tussen stappen)
│   ├── RecordingPositionStep.tsx          # Stap 1: tik op beeld + optioneel naam
│   ├── RecordingCaptureStep.tsx           # Stap 2: toont afbeelding-context + RecordingPanel
│   ├── RecordingSubmitStep.tsx            # Stap 3: bevestig + upload + success
│   └── RecordingSpot.tsx                  # Variant van PraatplaatSpot (mic-icoon, toggle-play)
├── hooks/
│   ├── useMicRecorder.ts                  # MediaRecorder wrapper + permissions
│   └── useRecordingUpload.ts              # Upload + finalize flow
├── lib/
│   └── praatplaatRecording.ts             # Supabase RPC wrappers
└── utils/
    └── audioFormat.ts                     # Browser-matrix: kies beste MIME type
```

### 5.2 Wijzigingen in bestaande files
- `types/index.ts`: `PraatplaatType = 'compositie' | 'opname'`; `ActivePraatplaatInfo` krijgt `type`, `maxRecordingSeconds`, `allowMultipleSpots`.
- `appStore.ts`: nieuwe `GameScreen = 'recording-praatplaat'`. Nieuwe state `recordingPraatplaatStep: 'position' | 'capture' | 'submit' | 'done'`.
- `lib/praatplaat.ts`: `getActivePraatplaat` returned `type`, `allowMultipleSpots` mee; `submit_praatplaat_composition` krijgt een guard ("niet beschikbaar voor opname-type").
- `components/praatplaat/PraatplaatViewer.tsx`: branches op `praatplaat.type`; voor opname-type: spots met toggle-play, geen afspeel-balk, afbeelding maximaal.
- `components/teacher/CreatePraatplaatModal.tsx`: toggle type + max-duration + meerdere-plekken toggle.
- `components/teacher/PraatplaatCard.tsx`: badge op type.
- `i18n/locales/{nl,en}.json`: nieuwe keys onder `praatplaat.recording.*` en `teacher.praatplaat.recording.*`.

### 5.4 Universeel RecordingPanel component

**Doel:** een herbruikbaar opname-component dat niets weet van praatplaten. Kan later ook ingezet worden voor #28 (eigen samples opnemen in studio) of andere features.

```tsx
// src/components/recording/RecordingPanel.tsx

interface RecordingPanelProps {
  /** Maximale opnameduur in seconden */
  maxDuration: number;
  /** Callback met de opgenomen audio-blob */
  onComplete: (blob: Blob, durationMs: number, mime: string) => void;
  /** Callback bij annuleren */
  onCancel: () => void;
}
```

**Staten van het panel:**
1. **Idle** — grote rode opnameknop, timer op 0:00, instructietekst.
2. **Recording** — knop pulseert, timer loopt, waveform-meter. Tik op knop = stop.
3. **Preview** — afspeelknop (play/pause toggle), waveform-visualisatie, knoppen "Opnieuw opnemen" en "Gereed".
4. Bij "Gereed" → roept `onComplete(blob, durationMs, mime)` aan. Het parent-component beslist wat ermee gebeurt (uploaden, opslaan, etc.).
5. Bij "Opnieuw" → bevestig-dialog, terug naar Idle.

**Geen kennis van:** praatplaten, upload-logica, Supabase, posities, klascodes.
**Wel kennis van:** MediaRecorder, AnalyserNode, format-detectie, permission state machine.

**Hergebruik-scenario's:**
- Praatplaat opname-flow (deze feature)
- #28 Eigen samples opnemen in studio (toekomstig)
- Eventueel: docent neemt instructie-audio op bij een praatplaat (toekomstig)

---

### 5.5 Audio-engine ontwerp (diepgaand onderzoek, v0.2)

#### 5.3.1 Formaat-strategie

**Besluit: WebM/Opus primair, MP4/AAC fallback.**

Browser-matrix 2026 (gebaseerd op MDN + WebKit blog + Chrome Platform Status):

| Formaat | Chrome/Chromebook | Android Chrome | Firefox | Safari macOS 18.4+ | Safari iOS 18.4+ | Safari iOS 14.3-18.3 | Safari <14.3 |
|---|---|---|---|---|---|---|---|
| `audio/webm;codecs=opus` | Ja | Ja | Ja | Ja | Ja | Nee | Nee |
| `audio/mp4` (AAC) | Ja | Ja | Nee | Ja | Ja | Ja | Nee (geen MediaRecorder) |
| `audio/wav` | Deels | Deels | Ja | Nee (dropped 14.1+) | Nee | Nee | Nee |
| `audio/ogg;codecs=opus` | Nee | Nee | Ja | Nee | Nee | Nee | Nee |

**Conclusie:** Safari 18.4+ (maart 2025) was een kantelpunt: WebM/Opus werkt nu op alle drie grote engines. MP4/AAC is alleen nodig voor iPads met iOS 14.3-18.3. iPads met iOS <14.3 ondersteunen MediaRecorder helemaal niet → die krijgen een duidelijke foutmelding.

Bestandsgrootte bij 15 seconden mono:

| Bitrate | WebM/Opus | MP4/AAC | WAV |
|---|---|---|---|
| 32 kbps | ~60 KB | ~60 KB | n.v.t. |
| 64 kbps | ~120 KB | ~120 KB | n.v.t. |
| 96 kbps | ~180 KB | ~180 KB | n.v.t. |
| Ongecomprimeerd | n.v.t. | n.v.t. | ~1.4 MB |

**Sweet spot: 64–96 kbps mono Opus.** Voldoende kwaliteit voor stem + klankexperimenten via tablet-speakers. Bij 25 leerlingen × 180 KB = 4.5 MB per praatplaat. Supabase free tier (1 GB) → ~220 praatplaten. Ruim.

#### 5.3.2 Library-keuze: geen extern, eigen hook

**Onderzochte libraries (GitHub, april 2026):**

| Library | Stars | Laatste update | TypeScript | Bundel | Oordeel |
|---|---|---|---|---|---|
| `RecordRTC` | 6.852 | Actief | Community types | ~45 KB | Te groot, te veel features |
| `react-media-recorder` | ~1.2k | 8 mnd geleden | Ja | ~5 KB | Goed, maar geen custom needs |
| `react-audio-recorder` | ~400 | Actief | Ja | ~73 KB (MP3 encoder) | MP3 encoder overhead onnodig |
| `extendable-media-recorder` | ~700 | Actief | Ja | WASM overhead | Overkill; polyfill niet nodig |
| `opus-media-recorder` | ~200 | Inactief | Nee | WASM | Niche; browser-native volstaat |
| `audio-recorder-polyfill` | ~600 | Beperkt | Nee | Klein | Safari bug in v117; fragiel |

**Besluit: eigen `useMicRecorder` hook (~80-100 LOC).**

Redenen:
1. SoundScout volgt al het patroon van eigen hooks die Web Audio wrappen (`useAudioEngine`, `useAudioExport`, `useVideoExport`). Een recorder-hook past in dat patroon.
2. Onze requirements zijn specifiek: max-duur timer, realtime waveform via `AnalyserNode`, permission state machine, format-detectie. Geen library biedt dit precies.
3. Geen extra dependency = geen supply-chain risico (onderwijsapp, minimale aanvalsvlak).
4. Native `MediaRecorder` + `getUserMedia` is stabiel genoeg in 2026 — polyfills zijn niet meer nodig op onze target devices.

#### 5.3.3 Audio-engine architectuur

```
useMicRecorder hook
├── State machine: idle → requesting-permission → ready → recording → stopped → error
├── MediaRecorder instance (created on permission grant)
│   ├── mimeType: pickBestMimeType()
│   ├── audioBitsPerSecond: 64000 (mono)
│   └── ondataavailable → chunks[] (accumulated Blob parts)
├── AnalyserNode (real-time waveform during recording)
│   ├── Shared AudioContext with AudioService (Tone.js context)
│   └── 30 FPS throttled canvas updates
├── Timer (max duration enforcement)
│   └── requestAnimationFrame-based, stops MediaRecorder at limit
├── Output: Blob (WebM or M4A)
│   ├── Local playback: URL.createObjectURL(blob) → <audio> element
│   └── Upload: blob → signed URL PUT → finalize RPC
└── Cleanup: revokeObjectURL, stream.getTracks().forEach(t => t.stop())
```

**Kritisch punt — AudioContext delen:**
SoundScout heeft al een `AudioContext` via Tone.js (`Tone.getContext()`). Een tweede `AudioContext` voor de recorder kan op sommige mobiele browsers geblokt worden (max 1-2 contexts). Oplossing: `useMicRecorder` gebruikt `Tone.getContext().rawContext` als basis voor de `AnalyserNode`, zodat er slechts één context actief is. De `MediaRecorder` zelf heeft geen `AudioContext` nodig — die werkt rechtstreeks op de `MediaStream`.

#### 5.3.4 Afspelen in viewer: `<audio>` element, niet Tone.js

De `PraatplaatViewer` speelt composities af via `audioService` (Tone.js transport + Part). Voor opnames is Tone.js overkill en risicovol:
- Een opname is één audiobestand, geen beat-based timeline.
- Tone.js transport state (play/pause/stop) interfereert met een los bestand.
- Twee audio-bronnen tegelijk → dubbel geluid bij snelle wisseling.

**Oplossing:** viewer detecteert `praatplaat.type` en gebruikt:
- `type === 'compositie'` → bestaande `audioService` flow (ongewijzigd).
- `type === 'opname'` → `<audio>` element met signed URL als `src`.

Gedeelde stop-coördinator: `audioService.stop()` wordt altijd aangeroepen bij type-wissel, en de `<audio>` ref wordt gepauzeerd + currentTime gereset. Eén simpele `useEffect` cleanup.

#### 5.3.5 V3 docent-studio: signed URL TTL

Wanneer de docent later opnames als samples in de studio wil laden:
- `AudioService.loadSamples()` werkt al met elke URL → signed URLs functioneren direct.
- **Probleem:** Supabase signed URLs verlopen default na 1 uur. Een studiosessie kan langer duren.
- **Oplossing v3:** genereer URLs met 4 uur TTL (`createSignedUrl(path, 14400)`), of implementeer auto-refresh: een `useEffect` die elke 50 minuten nieuwe URLs ophaalt en de sample-objecten in `libraryStore` ververst. Tone.js players hoeven niet opnieuw geladen — de audio zit al in geheugen na eerste `load()`.

#### 5.3.6 Format-detectie utility

```ts
// src/utils/audioFormat.ts

interface AudioFormatInfo {
  mime: string;
  ext: string;
  codec: string;
}

const FORMAT_CANDIDATES: AudioFormatInfo[] = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm', codec: 'opus' },
  { mime: 'audio/mp4;codecs=mp4a.40.2', ext: 'm4a', codec: 'aac' },
  { mime: 'audio/webm', ext: 'webm', codec: 'unknown' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg', codec: 'opus' },
];

export function pickBestMimeType(): AudioFormatInfo {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MEDIARECORDER_NOT_SUPPORTED');
  }
  for (const c of FORMAT_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  throw new Error('NO_SUPPORTED_AUDIO_FORMAT');
}

export function isRecordingSupported(): boolean {
  try {
    pickBestMimeType();
    return true;
  } catch {
    return false;
  }
}
```

#### 5.3.7 Permission state machine

```
                  ┌──────────────────────────┐
                  │         idle             │
                  └──────────┬───────────────┘
                             │ user taps "Record"
                  ┌──────────▼───────────────┐
                  │  requesting-permission   │
                  └──┬───────────────────┬───┘
       granted       │                   │  denied / error
  ┌──────────────────▼──┐     ┌──────────▼──────────┐
  │       ready         │     │  permission-denied  │
  └──────────┬──────────┘     │   / no-device       │
             │ tap record     │   / error            │
  ┌──────────▼──────────┐     └─────────────────────┘
  │     recording       │
  └──┬──────────────┬───┘
     │ user stops   │ max duration
  ┌──▼──────────────▼───┐
  │      stopped        │ → blob beschikbaar
  └──┬──────────────────┘
     │ user taps "Opnieuw"
     └──→ back to ready
```

---

## 6. Security, privacy & ethiek

### 6.1 Privacy (AVG/GDPR)

**Waarom dit nu relevant wordt:** composities (JSON met sample-ID's) bevatten geen persoonsgegevens. Stemopnames wél — een stem kan herleidbaar zijn tot een individu. Dit verandert de AVG-status van de feature fundamenteel.

**Rolverdeling:** School = verwerkingsverantwoordelijke (zij beslissen dat kinderen SoundScout gebruiken). SoundScout = verwerker (verwerkt data namens de school). Dit is de standaard in het Nederlandse onderwijs.

**Verwerkersovereenkomst (vereist voor pilotstart):**
Juridisch document tussen SoundScout en elke pilotschool. Bevat:
- Welke persoonsgegevens: stemopnames, optioneel naam leerling.
- Doel: educatieve activiteit in de klas.
- Bewaartermijn: 4 weken inactiviteit + 30 dagen graceperiode (zie §6.5).
- Opslaglocatie: Supabase (regio configureerbaar; EU aanbevolen).
- Beveiliging: RLS, signed URLs, versleuteling in transit (TLS) en at rest.
- Rechten betrokkenen: ouder/kind kan verwijdering vragen via docent.
- Sub-verwerker: Supabase (eigen DPA beschikbaar op supabase.com).

**Wat NIET nodig is:**
- Geen individuele toestemming per ouder/kind als school verwerkingsverantwoordelijke is met grondslag "publieke taak" (onderwijs).
- Geen DPIA bij pilot van 2-3 scholen.
- Geen Functionaris Gegevensbescherming (tenzij groot bedrijf).

**Praktisch:** template-verwerkersovereenkomst aanpassen (~halve dag werk). Parallel aan ontwikkeling. Moet klaar zijn vóór pilotstart. Supabase-regio controleren — EU verkieslijk.

### 6.2 Oneigenlijke content
- Grootste risico: kinderen nemen iets ongepast op (scheldwoord, gepest klasgenoot, ongepast geluid).
- **v1:** docent heeft stop-knop in viewer. Geen verplichte moderatie.
- **v1 UX-detail (besloten):** elke spot in de viewer heeft twee knoppen — koptelefoon-icoon (afspelen op eigen device, lokaal) en speaker-icoon (afspelen normaal). Niet verplicht, maar een subtiele eenmalige hint bij eerste viewer-opening: "Tip: beluister opnames eerst zelf via het koptelefoon-icoontje." Dismissible.
- **v2:** docent kan individuele opnames verwijderen.
- **v1.5 (optioneel):** moderatie-inbox; docent keurt opnames goed voordat ze in viewer verschijnen.

### 6.3 Microfoon-toestemming
- Browser vraagt toestemming bij eerste `getUserMedia()` call.
- Op school-managed Chromebooks kan de beheerder microfoon-toegang geblokt hebben → expliciete error-UI met uitleg + link naar docent.
- State machine: `'idle' | 'requesting-permission' | 'permission-denied' | 'no-device' | 'recording' | 'stopped' | 'error'`.

### 6.4 Uploadvalidatie
- Client schrijft `duration_ms`; server vertrouwt dit niet blind. In `finalize_recording_submission` kunnen we een hard maximum hanteren (`max_recording_seconds * 1500` bv., geeft marge).
- Bestandsgrootte-limiet in bucket policy: 2MB per object is ruim voldoende, hardblokkeer groter.
- MIME-whitelist server-side: alleen `audio/webm`, `audio/mp4`, `audio/ogg`.

### 6.5 Retentie & cleanup (besloten)

**Strategie: soft delete met graceperiode + handmatige definitieve verwijdering.**

Niveau 1 — Automatische markering:
- Kolom `last_activity_at TIMESTAMPTZ` op `praatplaten`. Wordt bijgewerkt bij: nieuwe opname, docent bekijkt opnames, activeer/deactiveer.
- Na 4 weken zonder activiteit: `pending_deletion_at` wordt gezet op `NOW() + 30 dagen` (via Supabase Edge Function of handmatige query).
- Er wordt niets verwijderd — alleen gemarkeerd.

Niveau 2 — Handmatige definitieve verwijdering:
- Storage-bestanden en database-rows blijven staan totdat eigenaar (B) ze expliciet verwijdert.
- Zo kan een backup geleverd worden als een docent erom vraagt.
- Totale retentie: 4 weken inactiviteit + 30 dagen grace = ~8 weken minimum.

Kolommen in migratie:
```sql
ALTER TABLE public.praatplaten
  ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN pending_deletion_at TIMESTAMPTZ NULL;
```

Storage-impact: 25 opnames x 180 KB = 4.5 MB per praatplaat. Verwaarloosbaar, ook bij honderden praatplaten.

---

## 7. Raakvlak met bestaande architectuur (diepgaande codebase-analyse v0.2)

### 7.0 Conclusie vooraf: geen herstructurering nodig

De bestaande architectuur is goed opgezet voor deze uitbreiding. De feature past als een geïsoleerde module in het bestaande systeem:
- `AudioService.loadSamples()` (1065 LOC) accepteert elke URL — signed URLs werken zonder wijziging.
- `libraryStore` (131 LOC) is sample-agnostisch — opnames zijn gewoon `Sample`-objecten met een andere `audioUrl`.
- `appStore` (164 LOC) heeft al `activePraatplaat` state; uitbreiden met `type` is triviaal.
- `SubmissionPlayer` (353 LOC) werkt op `CompositionData` — voor opname-praatplaten gebruiken we een simpeler `<audio>` element.
- `useStageSave` (224 LOC) hoeft niet gewijzigd — opnames gaan via een eigen submit-flow, niet via de stage.
- `supabase.ts` (12 LOC) heeft impliciet Storage-client beschikbaar (via `createClient`); nog nooit gebruikt in het project.

**Geschatte impact op bestaande code: ~145 regels wijzigingen. Geschatte nieuwe code: ~400 regels in nieuwe bestanden.**

Als de feature ooit verwijderd moet worden: verwijder de nieuwe bestanden + conditional branches + database-kolommen. Geen cascade-effect op bestaande features.

### 7.1 Hergebruik (hoog, ~60%)
| Bestaand | Hergebruik voor opname-feature |
|---|---|
| `praatplaten` tabel + RLS | Uitgebreid met `type` kolom; alle docent-RPC's blijven werken |
| `ClassDetail` praatplaat-sectie | Krijgt filter-tabs "Alle / Compositie / Opname" (optioneel) |
| `CreatePraatplaatModal` | Uitgebreid met type-toggle |
| `PraatplaatViewer` | Conditional render op type (zoals nu al bij `classId`-optie) |
| `PraatplaatSpot` | Hergebruikt; icoon wijzigt (Mic ipv ListMusic) bij opname-type |
| `appStore.activePraatplaat` | Model uitgebreid met `type` en `maxRecordingSeconds` |
| `ShareCodeInput` → routing | Één extra branch: `type === 'opname'` → `'recording-praatplaat'` screen |
| Rate-limiting infrastructuur | Direct toepasbaar op de 3 nieuwe RPC's |
| Confetti/success UX bij submit | Generiek hergebruikbaar |

### 7.2 Nieuw te bouwen
- MediaRecorder + permissions state machine (nergens anders in de codebase gebruikt — `grep` op `getUserMedia` en `MediaRecorder` gaf alleen **video**-export treffers).
- Supabase Storage integratie (eerste keer in dit project) — inclusief signed URL generatie server-side.
- Waveform tijdens opname (AnalyserNode → canvas). `AudioService` heeft al een `waveformCache` maar die is offline/render-based; opname-waveform is realtime en vereist eigen code.
- Drie-stappen wizard flow (positie → opnemen → previewen).

### 7.3 Risico's in raakvlak
- **Tone.js en `<audio>` naast elkaar:** viewer speelt nu via `audioService` (Tone.js transport). Voor opnames is Tone overkill; gewoon `<audio>` element volstaat. Maar: als docent tussen opnames en composities schakelt, moeten we garanderen dat `audioService.stop()` **en** het `<audio>`-element pauzeren. Risico op dubbel geluid.
- **Storage bucket quota:** Supabase free tier = 1 GB. Bij 30 leerlingen × 40KB × 10 praatplaten = 12 MB. Prima voor nu, maar groei-rekenmodel opnemen.
- **ON DELETE bij praatplaat → storage orphans:** de `005_praatplaten.sql` zet submissions.praatplaat_id op NULL bij delete. Storage-objecten moeten expliciet mee verwijderd worden — makkelijk te vergeten. Migratie moet een trigger bevatten.
- **`composition_data` XOR constraint:** zie §4.1, bestaande nullable-rows kunnen het breken. Verificatie vooraf nodig.
- **Rate-limiting mag niet te strikt zijn bij klas van 30:** 10/min per klascode voor `request_recording_upload_url` is weinig als hele klas tegelijk indient. Overweeg 60/min of per-IP-fallback.

### 7.4 i18n impact
Nieuwe key-tree nodig (Nederlands default):
```
praatplaat.recording:
  select.instruction, select.confirm
  capture.tapToRecord, capture.recording, capture.stop, capture.maxDurationHint
  preview.listen, preview.rerecord, preview.submit, preview.changePosition
  submit.success, submit.alreadySubmitted
  errors.permissionDenied, errors.noDevice, errors.uploadFailed, errors.tooLong
teacher.praatplaat.recording:
  type.compositie, type.opname
  createModal.typeLabel, createModal.maxDurationLabel
  viewer.play, viewer.stop, viewer.previewLabel
  card.badge
```

---

## 8. Risico-analyse (eerlijk & volledig)

| # | Risico | Impact | Waarschijnlijkheid | Mitigatie |
|---|---|---|---|---|
| R1 | Kind neemt ongepaste content op; docent speelt klassikaal af → gênant moment | Hoog (reputationeel) | Midden | Preview-stap voor docent; moderatie-inbox in v1.5 |
| R2 | MediaRecorder niet ondersteund op oudere iPads (iOS <14.3) / sommige Chromebook-policies | Midden (feature onbruikbaar voor deelgroep) | Midden | Duidelijke fallback-UI "jouw apparaat ondersteunt dit niet, vraag docent om ander device" |
| R3 | Mic-permissie geblokt door schoolbeheer-policy | Hoog (op die scholen onbruikbaar) | Midden | Duidelijke error-flow met instructie voor docent/ICT-coördinator |
| R4 | AVG/ouder-bezwaar tegen stemopnames van minderjarigen | Zeer hoog (juridisch) | Laag-Midden (afhankelijk van scholen) | Expliciete opt-in + retention policy + privacy-pagina update |
| R5 | Storage-kosten groeien onvoorspelbaar | Midden | Laag (klein publiek nu) | Monitoring + 60-dagen lifecycle policy + max 50 opnames per praatplaat (soft cap) |
| R6 | Client-side upload faalt halverwege; submission-row blijft "hangend" | Laag (UX-vervelend) | Midden | `finalize_recording_submission` verifieert bestand aanwezig; anders rollback. Periodieke cleanup van weesrecords. |
| R7 | Leerling omzeilt "eenmalig indienen" via incognito | Laag (bewust geaccepteerd) | Hoog | Accept. Docent heeft in v2 reset-knop als het problematisch wordt. |
| R8 | XOR-constraint breekt bestaande bewaarcode-rows met `composition_data = NULL` | Middel (regressie) | Midden | Vooraf query draaien + constraint soepeler maken (allow beide NULL) |
| R9 | Klas van 30 stuurt tegelijk in → rate-limit raakt dicht | Midden (UX) | Midden | Ruime limits (60/min/klas) + retry-UI |
| R10 | Signed URLs lekken via logs / gedeelde schermen | Laag | Laag | Korte TTL (1 uur viewer, 5 min upload); geen logs van URLs |
| R11 | Tone.js + `<audio>` dubbel afspelen | Laag (UX) | Midden | Gedeelde stop-coördinator in viewer; tests |
| R12 | Feature "afleidt" van de kerncompositie-flow → waarde-dilutie | Middel (product-richting) | Laag-Midden | Zie §10 Kritische reflectie |

---

## 9. V3-vooruitblik: Docent-studio met leerling-opnames

Jouw idee: docent opent studio waarin bibliotheek de leerling-opnames bevat.

**Haalbaarheid:** middel-hoog. Vereist:
- Nieuwe "virtuele sample-library" modus in `libraryStore`: in plaats van uit thema's, laad samples van `getPraatplaatRecordings()`.
- Elk opname-object mapt naar `Sample` type: `{ id, name: "Kind 1", audioUrl: signedUrl, duration: duration_ms/1000, icon: 'Mic', color: random }`.
- Duration-kennis is kritisch: de timeline werkt in beats (120 BPM, 32 beats standaard). Opnames van 15s zijn ~30 beats bij 120BPM → overweeg BPM aanpasbaar te maken of timeline-duur variabel (hangt af van #65 clip loop status).
- `AudioService.loadSamples()` werkt al met URLs; signed URLs moeten alleen op tijd refresht worden (1u TTL kan te kort zijn voor een lange sessie → gebruik 4u of implementeer auto-refresh).
- Geen inzending vanuit docent-studio; dit is puur presenteer-mode, evt. exporteer naar MP3 (bestaand).

**Nieuwe UX:** "Studio openen" knop in `PraatplaatViewer` bij opname-type. Opens bestaande `StudioView` met een nieuwe `libraryMode: 'recordings'` flag.

**Blokker:** onze `scheduleTimeline()` en effect-chains zijn ontworpen voor bekende, gecachete samples. Signed URLs vervallen — moeten we opnieuw laden bij refresh. Niet onmogelijk, wél werk. Prima voor v3.

---

## 10. Kritische reflectie — sluit dit aan bij SoundScout?

*Je vroeg om een eerlijke, objectieve mening. Hier komt hij.*

### Sterke aansluitingen
1. **Pedagogisch consistent.** SoundScout gaat over "verzamel geluid, plaats het in een compositie." Opnames in een praatplaat zijn letterlijk hetzelfde verhaal maar met de klas als sample-bron. Dat rijmt goed.
2. **Verlaagt drempel voor groep 3-5.** De studio met beats/tracks/BPM is voor jongere kinderen complex. Tik-op-beeld + 15s opnemen is veel laagdrempeliger en past bij ontwikkelingsstadium.
3. **Benut bestaande infrastructuur.** ~60% hergebruik betekent dat deze feature relatief goedkoop toe te voegen is t.o.v. de leereffect.
4. **Klassikale activering.** Net als de bestaande praatplaat schreeuwt dit om klassikaal gebruik op digibord — past bij hoe SoundScout volgens jouw copy daadwerkelijk wordt ingezet.

### Zwakke aansluitingen / zorgpunten
1. **Dilueert de kerncompetentie?** SoundScout is een *compositie-leer-tool*. Een 15s opname leren kinderen géén compositie; ze leren geluid-documentatie. Dat is waardevol maar iets anders. Als dit succesvoller wordt dan de studio-flow, moet je je afvragen of je eigenlijk Seesaw/Flipgrid bouwt. Strategisch: dit is prima als *opstapje* naar compositie, risicovol als *eindbestemming*.
2. **Nieuwe technische surface area.** MediaRecorder, Storage, mic-permissies, signed URLs, Storage-quota, AVG-implicaties: dit is eerste keer in de codebase. De feature zelf is niet enorm, maar de onderhoudslast nieuwe categorie (storage-kosten, moderatie, ouderbezwaren) gaat structureel zijn.
3. **Moderatie-verantwoordelijkheid verschuift naar docent.** Tot nu toe is SoundScout "veilig by design" — kinderen kunnen alleen bestaande samples kiezen. Met opnames wordt de docent verantwoordelijk voor wat klinkt. Niet elke docent is daar op voorbereid of blij mee.
4. **Apparaatafhankelijkheid.** De rest van SoundScout werkt overal. Microfoon-features werken minder goed op Chromebooks-met-strikte-policies en oudere iPads — precies de apparaten die scholen hebben. Risico op "feature doet het niet" klachten.
5. **"Tijdelijke toevoeging" is een rode vlag.** Je omschreef het als tijdelijk. Prima voor experimenteren, maar data-model-wijzigingen aan `submissions` (XOR-constraint, extra kolommen) zijn niet tijdelijk — die blijven altijd. Als dit wordt teruggerold, moeten we dat nu al plannen. Overweeg: wil je deze feature echt productie-klaar, of is een prototype-tak voldoende?

### Aanbeveling
**Bouwen, maar met een paar aangescherpte randvoorwaarden:**
- Pak v1 = MVP scope zoals hierboven, maar **voeg de preview-stap voor docent toe** voordat een opname klassikaal afspeelbaar is. Dat is een kleine toevoeging met grote risicoreductie.
- Communiceer intern *wanneer* je deze feature promoot als "de instap" vs "een alternatief." Marketing-discipline: het wordt een instap naar de studio, geen vervanging.
- Commit expliciet aan een pilot-klas van ~2 scholen voor 4-6 weken voordat je het breed uitrolt. Kijk naar *hoe vaak* het gebruikt wordt vs de studio-flow. Als opname-praatplaten 3× zo vaak gebruikt worden, heb je een strategiekwestie.
- Definieer NU al wat het criterium is om de feature te behouden vs verwijderen. Anders wordt "tijdelijk" permanent.

---

## 11. Succesmetrieken

| Metric | Streefwaarde 6 weken na launch | Waarom |
|---|---|---|
| Aantal aangemaakte opname-praatplaten / docent | ≥ 1 | Basis-adoptie |
| Indienratio (submissies / actieve leerlingen) | ≥ 60% | UX-kwaliteit |
| Herop-name acties per submission | 1-3 (gezond) / >5 (frictie) | UX-kwaliteit |
| Mislukte uploads | < 3% | Technische stabiliteit |
| Verhouding opname- vs compositie-praatplaten / docent | Opname ≤ 40% | Strategische richting bewaken |
| Aantal verzoeken tot verwijdering (v2) | Trackbaar | Moderatie-noodzaak inschatten |

---

## 12. Open vragen — status

### Besloten (2026-04-13)
| # | Vraag | Beslissing | Rationale |
|---|---|---|---|
| 1 | Preview-stap voor docent | **v1: niet verplicht, wel beschikbaar** | Koptelefoon-icoon + speaker-icoon naast elkaar. Eenmalige hint "beluister eerst zelf". Niet verplicht. |
| 2 | Anonimiteit leerling | **Optioneel naamveld** | Hergebruik bestaand `student_name` pattern. Niet verplicht, maar docent kan er om vragen. |
| 3 | Fallback oudere apparaten | **Foutmelding + stop** | Geen complexe fallback. Simpele melding: "Dit apparaat ondersteunt geen opnames." Leerling gebruikt ander device. |
| 4 | Uitrolstrategie | **Feature flag / pilot** | Beperkt risico, gerichte feedback van 2-3 scholen, 8 weken evaluatieperiode. |
| 5 | Opslag | **Supabase Storage bucket** | Private bucket met signed URLs. Signed upload URL pattern (geen directe anon-uploads). |
| 6 | Audio-formaat | **WebM/Opus + MP4/AAC fallback** | Eigen `useMicRecorder` hook, geen externe library. 64-96 kbps mono. |
| 7 | Architectuur | **Nieuwe variant `type='opname'` naast bestaande** | Veld op `praatplaten` tabel. Geen hybride in v1. Deur open voor toekomstige convergentie. |
| 8 | Eenmalig indienen | **Client-side localStorage flag (zacht)** | Bewust omzeilbaar; pragmatisch voor schoolcontext. Docent krijgt reset-knop in v2. |
| 9 | Trimmen van opnames | **Nee in v1** | 15s is kort genoeg; beetje stilte is niet erg. Overweeg in v2 als docenten erom vragen. |
| 10 | Offline-opname + retry | **Nee in v1, ja in v1.5** | Simpele retry-met-foutmelding voldoende. Echte queue later als nodig. |
| 11 | AVG verwerkersovereenkomst | **School = verantwoordelijke, SoundScout = verwerker** | Template-verwerkersovereenkomst voorbereiden. Parallel aan dev, klaar voor pilotstart. Zie §6.1. |
| 12 | Max opnames per praatplaat | **Soft cap: 50** | Enforce in `finalize_recording_submission` RPC. Ruim voor typische klas (25-30). |
| 13 | Simultaan afspelen | **Nee in v1** | Opnames zonder gedeeld beat-grid = cacofonie. Pas zinvol in v3 (docent-studio met timeline). |
| 14 | Retentiebeleid | **Soft delete: 4 weken inactiviteit → markering, handmatige definitieve delete** | Graceperiode van 30 dagen na markering. Storage-bestanden blijven tot handmatige actie. Zie §6.5. |
| 15 | Meerdere plekken per leerling | **Docent-instelling per praatplaat** | Toggle bij aanmaken (standaard uit). Kolom `allow_multiple_spots BOOLEAN` op `praatplaten`. |
| 16 | Opname-paneel UX | **Standaard scherm, geen inschuif-overlay** | Universeel `RecordingPanel` component, herbruikbaar buiten praatplaat-context. Zie §5.4. |
| 17 | Success-scherm | **Eenvoudig: checkmark + tekst + terug-knop** | Geen animaties, geen confetti. |
| 18 | Viewer afspeel-balk | **Geen balk; spot-icoon is de knop (toggle-play)** | Afbeelding maximaal. Tik = play, tik = stop. Pulserend icoon tijdens afspelen. |

### Alle vragen zijn besloten. Geen open punten meer.

---

## 13. Aangescherpte voorwaarden (definitief)

Deze voorwaarden zijn besproken en vastgesteld:

1. **Device-check als eerste stap.** Zodra klascode is ingevoerd en `type === 'opname'`, voer `isRecordingSupported()` check uit. Foutmelding bij geen ondersteuning, geen fallback.
2. **Feature flag voor pilot.** 2-3 scholen, 8 weken evaluatie. Exit-criteria: adoptie (≥1 praatplaat/docent), moderatie-incidenten (0-1 acceptabel), drempelverlaging jongere leerlingen (kwalitatief).
3. **Data-model alsof het permanent is.** Schone migratie, RLS, rate-limits. Geen shortcuts die later teruggebeten worden.
4. **Preview-optie voor docent in v1** (niet verplicht). Koptelefoon-icoon naast speaker-icoon in viewer. Eenmalige hint. Niet-dwingende UX.
5. **Geen externe audio-libraries.** Eigen `useMicRecorder` hook, passend bij het bestaande pattern van eigen hooks.
6. **Signed upload URL pattern.** Client uploadt nooit direct met anon-key naar Storage.
7. **Privacy-pagina op startscherm.** Geimplementeerd (2026-04-13): `PrivacyModal` component met Shield-icoon in footer. Drie secties: gegevensgebruik, klascode, cookies. i18n NL+EN. Wordt uitgebreid met opname-sectie wanneer feature live gaat.

---

## 14. Next steps (volgorde)

Alle open vragen zijn besloten. Onderstaande stappen kunnen direct opgepakt worden.

### Reeds afgerond
- [x] **Privacy-modal op startscherm** (2026-04-13). `PrivacyModal` component, Shield-icoon in footer, i18n NL+EN. TSC + 227 tests groen.

### Pre-development (parallel)
1. **Spike: MediaRecorder + getUserMedia op target devices** (2 uur). Test op: Chromebook, iPad recent, iPad 2020, Android tablet. Documenteer support matrix.
2. **Supabase Storage bucket + signed URL POC** (2 uur). Los van feature: kunnen we uploaden met anon key via signed URL? Werkt RLS? Quota? Welke regio staat Supabase?
3. **Verwerkersovereenkomst voorbereiden** (halve dag). Template zoeken, aanpassen, klaar hebben voor pilotstart.

### Development (3-5 dagen)
4. **Migratie 012 draft + review** (1 uur) — inclusief verificatie dat XOR-constraint bestaande data niet breekt.
5. **Feature flag mechanisme** (1 uur) — hoe schakelen we de feature in/uit per docent?
6. **Detail-design van 3-stappen wizard UI** (1 uur) — schets of wireframe.
7. **Implementatie v1** (schatting 3-5 dagen, enkel ontwikkelaar):
   - Dag 1: Migratie + RPC's + Storage setup + `useMicRecorder` hook.
   - Dag 2: Leerling-flow (3 screens + device-check).
   - Dag 3: Viewer-aanpassingen + teacher modal uitbreiding + koptelefoon/speaker iconen.
   - Dag 4: i18n + polish + edge cases + feature flag + retentie-kolommen.
   - Dag 5: Testen op target devices + bugfixen.

### Post-development
8. **Pilot-test bij 2-3 scholen** gedurende 8 weken.
9. **Na 8 weken: evaluatie op exit-criteria:**
   - Adoptie: ≥1 opname-praatplaat per docent?
   - Moderatie: 0-1 incidenten?
   - Drempelverlaging: kwalitatieve feedback van docenten groep 3-5?
   → Beslissing: breed uitrollen, doorontwikkelen (v1.5/v2), of deprecaten.

---

*PRD v0.3 — Alle vragen besloten. Klaar voor pre-development spikes.*
