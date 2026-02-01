# SoundScout - Implementatie Voortgang

## Technische beslissingen

| Beslissing | Keuze | Motivatie |
|---|---|---|
| State management | Zustand | Lightweight, eenvoudige API, geen boilerplate |
| Drag & Drop | dnd-kit | Moderne API, goede a11y, actief onderhouden |
| Styling | Tailwind CSS v4 | Snelle development, consistent design system |
| Audio | Tone.js | Robuuste Web Audio abstractie, scheduling |
| Build tool | Vite | Snelle HMR, optimale productie builds |
| i18n | react-i18next | Industriestandaard, lazy loading, NL als default |
| Audio assets | Placeholders | Gebruiker levert later echte MP3 bestanden |

## Belangrijke ontwerpbeslissingen

### Timeline = tijd-gebaseerd (NIET beats)
- Timeline werkt op seconden, niet beats. Geen BPM-instelling.
- Clips worden geplaatst op tijdposities (0.0s, 1.5s, 3.0s etc.)
- Optionele snap-to-grid (bijv. 0.5 seconde) voor gebruiksgemak.
- Sample-lengte bepaalt visuele breedte op timeline.

### Recorder → Library flow
- Hotspot klik: sample komt in recorder (max 6 slots)
- Recorder = "huidige sessie", eject mogelijk zolang in locatie
- "Naar Studio": alle recorder-samples worden aan library toegevoegd
- Bij terugkeer naar locatie: recorder leeg, library intact

---

## Stap 0: Analyse en planning
- [x] Lees PRD volledig (31-01-2026)
- [x] Maak implementatieplan (31-01-2026)
- [x] Identificeer technische beslissingen (31-01-2026)
- [x] Goedkeuring gebruiker (31-01-2026)

---

## Stap 1: Project setup
Status: **VOLTOOID** (31-01-2026)

- [x] Initialiseer Vite + React + TypeScript project (31-01-2026)
- [x] Installeer dependencies: tone, zustand, @dnd-kit/core, @dnd-kit/sortable, tailwindcss, @tailwindcss/vite (31-01-2026)
- [x] Installeer i18n: react-i18next, i18next (31-01-2026)
- [x] Configureer tsconfig.json met strict mode (31-01-2026) - was al standaard in Vite template
- [x] Configureer Tailwind CSS v4 met Vite plugin (31-01-2026)
- [x] Configureer i18n: src/i18n/ met NL als default, EN voorbereid (31-01-2026)
- [x] Maak mappenstructuur aan (31-01-2026)
- [x] Maak public asset mappen aan (31-01-2026)
- [x] Test: npm run dev start zonder errors (31-01-2026)
- [x] Test: npm run build compileert zonder errors (31-01-2026)
- [x] Test: Tailwind CSS classes werken in App.tsx (31-01-2026)
- [x] Test: i18n useTranslation() retourneert NL teksten (31-01-2026)

### Testresultaten Stap 1
- `npm run build`: Succesvol (63 modules, 714ms)
- `npm run dev`: Server start op localhost:5173
- TypeScript: Geen errors (strict mode actief)
- Tailwind: Classes bg-sky-50, text-sky-800 etc. worden correct gecompileerd
- i18n: NL/EN locale bestanden geladen, useTranslation() hook werkt

---

## Stap 2: Type definities
Status: **VOLTOOID** (31-01-2026)

- [x] Maak src/types/index.ts met alle interfaces (31-01-2026)
- [x] Types: Location, Hotspot, Sample, RecorderState, LibraryState (31-01-2026)
- [x] Types: TimelineState (intern beat-gebaseerd), Track, Clip, GameState, Composition (31-01-2026)
- [x] GameScreen + VisualHint type aliases (31-01-2026)
- [x] LibraryState.collectedSampleIds voor duplicaatpreventie (31-01-2026)
- [x] Test: geen TypeScript errors (31-01-2026)

### Testresultaten Stap 2
- `npx tsc --noEmit`: Geen errors
- `npm run build`: Succesvol (63 modules, 758ms)

### Ontwerpkeuzes Stap 2
- TimelineState.bpm: fixed intern (bijv. 120), niet door gebruiker aanpasbaar
- Clip.startBeat: in beats voor Tone.js scheduling, visueel vertaald zonder beat-labels
- Sample.duration: in seconden (wordt omgerekend naar beats via bpm)
- Composition.createdAt: ISO date string (serializable, geen Date object)
- LibraryState.collectedSampleIds: string[] voor O(1)-achtige duplicaatcheck

---

## Stap 3: Data configuratie
Status: **VOLTOOID** (31-01-2026)

- [x] Maak src/data/locations.ts met park-locatie (8 hotspots) (31-01-2026)
- [x] Maak src/data/samples.ts met 8 sample definities (31-01-2026)
- [x] Type-safe data met imports uit types/ (31-01-2026)
- [x] i18n keys voor locatie- en sample-namen (31-01-2026)
- [x] Helper functies: getLocationById, getSampleById, getSamplesByLocationId (31-01-2026)
- [x] 8 unieke kindvriendelijke kleuren voor timeline visualisatie (31-01-2026)
- [x] Test: data compileert zonder errors (31-01-2026)

### Testresultaten Stap 3
- `npx tsc --noEmit`: Geen errors
- `npm run build`: Succesvol (63 modules, 644ms)
- Audio paden: `/audio/locations/park/{id}.mp3` (placeholder, bestanden nog niet aanwezig)

### Sample kleuren
| Sample | Kleur | Hex |
|---|---|---|
| Vogels | Groen | #4CAF50 |
| Fontein | Blauw | #2196F3 |
| Voetstappen | Bruin | #795548 |
| Hond | Oranje | #FF9800 |
| Fiets | Roze | #E91E63 |
| Wind | Cyaan | #00BCD4 |
| Kinderen | Amber | #FFC107 |
| IJscowagen | Paars | #9C27B0 |

---

## Stap 4: State management
Status: **VOLTOOID** (31-01-2026)

- [x] gameStore.ts - currentScreen, currentLocationId + navigatie actions (31-01-2026)
- [x] audioStore.ts - isPlaying, currentBeat + play/pause/stop (31-01-2026)
- [x] libraryStore.ts - recorder (6 slots) + library + collectedSampleIds (31-01-2026)
- [x] timelineStore.ts - 4 tracks, bpm=120, 32 beats + clip CRUD (31-01-2026)
- [x] Actions: navigatie (setScreen, goToStudio, goToLocation, goToClub) (31-01-2026)
- [x] Actions: recorder (add, eject, clear, transferToLibrary) (31-01-2026)
- [x] Actions: timeline (addClip, removeClip, moveClip, clearTrack, clearAll) (31-01-2026)
- [x] Duplicaatpreventie: recorder + library level (31-01-2026)
- [x] Overlap preventie: clips op zelfde beat/track geblokkeerd (31-01-2026)
- [x] Test: TypeScript compileert zonder errors (31-01-2026)

### Testresultaten Stap 4
- `npx tsc --noEmit`: Geen errors
- `npm run build`: Succesvol (63 modules, 677ms)

### Store overzicht
| Store | State | Actions |
|---|---|---|
| gameStore | currentScreen, currentLocationId | setScreen, goToLocation, goToStudio, goToClub |
| audioStore | isPlaying, currentBeat | play, pause, stop, setCurrentBeat |
| libraryStore | recorderSlots[6], librarySamples, collectedSampleIds | addToRecorder, removeFromRecorder, clearRecorder, transferRecorderToLibrary |
| timelineStore | tracks[4], bpm=120, totalBeats=32, isLooping | addClip, removeClip, moveClip, clearTrack, clearAllTracks, setLooping |

---

## Stap 5: Audio engine basis
Status: **VOLTOOID** (31-01-2026)

- [x] src/utils/audio.ts - beatsToSeconds, secondsToBeats, getSampleEndBeat (31-01-2026)
- [x] src/hooks/useAudioEngine.ts custom hook (31-01-2026)
- [x] Sample loading: loadSample, loadSamples, isSampleLoaded (31-01-2026)
- [x] Sample playback: playSample, stopSample, stopAll (31-01-2026)
- [x] Timeline: scheduleTimeline, playTimeline, pauseTimeline, stopTimeline (31-01-2026)
- [x] Web Audio context: initAudio, isAudioReady (31-01-2026)
- [x] Playhead updates: 20fps interval die audioStore.setCurrentBeat() bijwerkt (31-01-2026)
- [x] Graceful error handling: console.warn bij ontbrekende audio files (31-01-2026)
- [x] Cleanup: dispose players en cancel transport on unmount (31-01-2026)
- [x] Test: TypeScript compileert zonder errors (31-01-2026)

### Testresultaten Stap 5
- `npx tsc --noEmit`: Geen errors
- `npm run build`: Succesvol (63 modules, 747ms)
- Functionele test: wacht tot UI componenten (Stap 6+) beschikbaar zijn

### Audio Engine API
| Functie | Beschrijving |
|---|---|
| initAudio() | Start Tone.js audio context (vereist user gesture) |
| loadSample(sample) | Laad audio bestand in Tone.Player + cache |
| loadSamples(samples) | Bulk loading via Promise.allSettled |
| playSample(id) | Speel enkel sample af (preview/hotspot) |
| stopSample(id) | Stop specifieke sample |
| stopAll() | Stop alle actieve playback |
| scheduleTimeline(tracks, samples) | Schedule clips op Tone.Transport |
| playTimeline() | Start transport + playhead updates |
| pauseTimeline() | Pauzeer transport |
| stopTimeline() | Stop + reset naar begin |

---

## Stap 6: Startscherm
Status: **VOLTOOID** (31-01-2026)

- [x] StartScreen.tsx met i18n teksten (titel, tagline, tutorial stappen) (31-01-2026)
- [x] "Start Spel" knop met initAudio() + navigatie naar park (31-01-2026)
- [x] "Hoe werkt het?" knop met tutorial overlay (4 stappen uitleg) (31-01-2026)
- [x] Loading state tijdens audio initialisatie (31-01-2026)
- [x] App.tsx routing via gameStore.currentScreen (31-01-2026)
- [x] Placeholder schermen voor location, studio, club (31-01-2026)
- [x] i18n uitgebreid: tagline, loading, tutorialTitle, tutorialSteps, closeTutorial (31-01-2026)
- [x] Test: TypeScript + build zonder errors (31-01-2026)

### Testresultaten Stap 6
- `npx tsc --noEmit`: Geen errors
- `npm run build`: Succesvol (1032 modules, 1.44s)
- Bundle: 480KB JS (incl. Tone.js), 18KB CSS

### Componenten
| Component | Locatie | Functie |
|---|---|---|
| StartScreen | src/components/StartScreen.tsx | Welkomstscherm met start + tutorial |
| App | src/App.tsx | Screen routing via gameStore |

---

## Stap 7: Locatie-scherm
Status: **VOLTOOID** (31-01-2026)

- [x] LocationScene.tsx container met hotspots + recorder + navigatie (31-01-2026)
- [x] Hotspot.tsx met visuele hints (glow/pulse CSS animaties) (31-01-2026)
- [x] RecorderBar.tsx met 6 slots, preview, eject, counter (31-01-2026)
- [x] Klik hotspot → sample afspeelt + in recorder (31-01-2026)
- [x] Bij 6 samples: "Recorder vol" modal met opties (31-01-2026)
- [x] Navigatie: terug naar start + naar studio (31-01-2026)
- [x] transferRecorderToLibrary() bij "Naar Studio" (31-01-2026)
- [x] Sample loading on mount via useAudioEngine (31-01-2026)
- [x] Disabled state: reeds verzameld of recorder vol (31-01-2026)
- [x] i18n: location.stayHere toegevoegd (NL + EN) (31-01-2026)
- [x] CSS animaties: hotspot-glow + hotspot-pulse in index.css (31-01-2026)
- [x] App.tsx routing bijgewerkt met LocationScene (31-01-2026)
- [x] Test: TypeScript + build zonder errors (31-01-2026)

### Testresultaten Stap 7
- `npm run build`: Succesvol (1038 modules, 1.54s)
- Bundle: 489KB JS, 25KB CSS
- Geen TypeScript errors

### Componenten Stap 7
| Component | Locatie | Functie |
|---|---|---|
| LocationScene | src/components/location/LocationScene.tsx | Container: data laden, hotspots renderen, recorder, navigatie, modal |
| Hotspot | src/components/location/Hotspot.tsx | Klikbare hotspot op %-positie, glow/pulse animatie, disabled state |
| RecorderBar | src/components/location/RecorderBar.tsx | 6 horizontale slots, icon + naam, eject/preview, counter |

### Interactie-flow
1. LocationScene mount → loadSamples() voor huidige locatie
2. Klik hotspot → playSample() + addToRecorder()
3. Recorder vol (6/6) → modal: "Naar Studio?" / "Hier blijven"
4. "Naar Studio" → stopAll() + transferRecorderToLibrary() + goToStudio()
5. "Terug" → stopAll() + terug naar startscherm

---

## Stap 8: Studio-scherm
Status: **VOLTOOID** (31-01-2026)

### Stap 8a: StudioView + SampleLibrary
- [x] StudioView.tsx container met DndContext, navigatie, store integratie (31-01-2026)
- [x] SampleLibrary.tsx - draggable samples met icon, naam, kleur, preview knop (31-01-2026)

### Stap 8b: Timeline + Track + Clip
- [x] Timeline.tsx - 4 tracks, visuele grid (per beat, major elke 4), playhead (31-01-2026)
- [x] Track.tsx - droppable track met track label, clip rendering (31-01-2026)
- [x] Clip.tsx - positionering + breedte gebaseerd op beats, kleur, icon, delete knop (31-01-2026)

### Stap 8c: TransportControls
- [x] TransportControls.tsx - play/pause toggle, stop, loop toggle, clear all met bevestiging (31-01-2026)

### Integratie
- [x] Drag-and-drop library → timeline via @dnd-kit/core (PointerSensor, distance: 8) (31-01-2026)
- [x] Snap-to-beat: berekent dichtstbijzijnde beat positie bij drop (31-01-2026)
- [x] Overlap preventie via timelineStore.addClip() (31-01-2026)
- [x] Tone.Transport scheduling via useAudioEngine.scheduleTimeline() (31-01-2026)
- [x] Playhead updates via audioStore.currentBeat (31-01-2026)
- [x] "Naar Club" disabled tot er clips op timeline staan (31-01-2026)
- [x] App.tsx routing bijgewerkt met StudioView (31-01-2026)
- [x] i18n: studio.emptyLibrary, studio.dragHint, transport.confirmClear (NL + EN) (31-01-2026)
- [x] Test: TypeScript + build zonder errors (31-01-2026)

### Testresultaten Stap 8
- `npm run build`: Succesvol (1049 modules, 1.71s)
- Bundle: 542KB JS (incl. Tone.js + dnd-kit), 32KB CSS
- Geen TypeScript errors

### Componenten Stap 8
| Component | Locatie | Functie |
|---|---|---|
| StudioView | src/components/studio/StudioView.tsx | DndContext container, store integratie, drag logic, navigatie |
| SampleLibrary | src/components/studio/SampleLibrary.tsx | Draggable sample items met preview |
| Timeline | src/components/studio/Timeline.tsx | 4 tracks, beat grid, playhead |
| Track | src/components/studio/Track.tsx | Droppable track, rendert clips |
| Clip | src/components/studio/Clip.tsx | Clip visualisatie, positie/breedte op beats, delete |
| TransportControls | src/components/studio/TransportControls.tsx | Play/pause/stop/loop/clear |

### dnd-kit Interactie
1. PointerSensor met distance: 8 (voorkomt conflict click/drag)
2. Library sample = useDraggable met data `{ type: 'sample', sample }`
3. Track = useDroppable met data `{ type: 'track', trackIndex }`
4. DragOverlay toont preview van gesleepte sample
5. handleDragEnd: berekent beat uit pointer positie relatief aan track DOM rect
6. Snap-to-beat: `Math.round(rawBeat)` → hele beats
7. addClip() in store handelt overlap af

---

## Stap 9: Club-scherm
Status: **VOLTOOID** (31-01-2026)

- [x] ClubView.tsx met podium visualisatie (donker paars/indigo gradient) (31-01-2026)
- [x] Compositie afspelen: play/stop toggle + "opnieuw afspelen" (31-01-2026)
- [x] Compositie naam geven: tekstveld met placeholder "Mijn compositie" (31-01-2026)
- [x] Navigatie: "Terug naar Studio" + "Nieuwe compositie" met bevestigingsmodal (31-01-2026)
- [x] Visuele feedback: pulserende cirkel + uitdijende ringen tijdens playback (31-01-2026)
- [x] Publiek: rij emoji-figuren met bounce-animatie tijdens playback (31-01-2026)
- [x] Stage lights effect: subtiele gradient overlays als podiumverlichting (31-01-2026)
- [x] CSS animaties: stage-pulse, stage-ring (3 lagen), audience-bounce (31-01-2026)
- [x] i18n: club.title → "Het Podium", namePlaceholder, newComposition, nowPlaying (NL + EN) (31-01-2026)
- [x] App.tsx routing bijgewerkt met ClubView (31-01-2026)
- [x] Geen placeholder schermen meer in App.tsx (31-01-2026)
- [x] Test: TypeScript + build zonder errors (31-01-2026)

### Testresultaten Stap 9
- `npm run build`: Succesvol (1050 modules, 1.61s)
- Bundle: 548KB JS, 41KB CSS
- Geen TypeScript errors

### Componenten Stap 9
| Component | Locatie | Functie |
|---|---|---|
| ClubView | src/components/club/ClubView.tsx | Podium-scherm: afspelen, naamgeving, navigatie, visuele feedback |

### Club Interactie
1. Samples geladen on mount via loadSamples()
2. Play: scheduleTimeline() + playTimeline() (geen auto-play)
3. Stop: stopTimeline()
4. "Opnieuw afspelen": stop + korte delay + re-schedule + play
5. "Terug naar Studio": stopAll() + setScreen('studio')
6. "Nieuwe compositie": bevestigingsmodal → clearAllTracks() + clearRecorder() + terug naar locatie

---

## Stap 10: Navigatie flow en edge cases
Status: **VOLTOOID** (31-01-2026)

### Fixes
- [x] clearLibrary() action toegevoegd aan libraryStore (31-01-2026)
  - Wist alles: recorderSlots, librarySamples, collectedSampleIds
  - Wordt gebruikt bij "Nieuwe compositie" voor volledige reset
- [x] ClubView "Nieuwe compositie" gebruikt nu clearLibrary() i.p.v. clearRecorder() (31-01-2026)
  - Voorheen bleven librarySamples en collectedSampleIds achter na reset
- [x] Modal cancel-knop tekst: t('club.cancel') i.p.v. t('transport.stop') (31-01-2026)
- [x] i18n: club.cancel toegevoegd (NL: "Annuleer", EN: "Cancel") (31-01-2026)
- [x] StudioView: ongebruikte pointerPositionRef en useRef import verwijderd (31-01-2026)
- [x] StudioView handleDragEnd: else-branch retourneert nu bij non-PointerEvent (31-01-2026)

### Navigatie-flow verificatie
| Van | Naar | Actie | Status |
|---|---|---|---|
| Start → Locatie | goToLocation('park') | initAudio() + navigatie | OK |
| Locatie → Start | setScreen('start') | stopAll() + terug | OK |
| Locatie → Studio | goToStudio() | stopAll() + transferRecorderToLibrary() | OK |
| Studio → Locatie | goToLocation(id) | stopAll() + terug naar locatie | OK |
| Studio → Club | goToClub() | stopTimeline() + navigeer | OK |
| Club → Studio | setScreen('studio') | stopAll() + terug | OK |
| Club → Locatie | goToLocation(id) | stopAll() + clearAllTracks() + clearLibrary() | OK |

---

## Stap 11: Styling en UX
Status: **VOLTOOID** (31-01-2026)

### Accessibility
- [x] Globale focus-visible styling toegevoegd in index.css (31-01-2026)
  - `button:focus-visible`, `input:focus-visible`, `[role="button"]:focus-visible`
  - 3px solid indigo-500 outline met 2px offset
  - Pointer-clicks tonen geen outline (`:focus:not(:focus-visible)`)

### Responsive
- [x] RecorderBar slots: min-w-[56px] + overflow-x-auto (31-01-2026)
  - Voorkomt dat slots te smal worden op kleine schermen
  - Horizontaal scrollbaar als nodig
- [x] RecorderBar eject-knop: vergroot touch target met px-2 py-1 padding (31-01-2026)
- [x] Timeline: percentage-based layout schaalt correct (31-01-2026)
- [x] SampleLibrary: overflow-x-auto met shrink-0 items (31-01-2026)

### Code kwaliteit
- [x] Timeline.tsx: `t` parameter in tracks.every() hernoemd naar `tr` (31-01-2026)
  - Voorkwam verwarring met useTranslation() `t` functie

### Consistentie check
- [x] Button rounding: StartScreen=rounded-2xl (landing page), rest=rounded-xl (consistent per context) (31-01-2026)
- [x] Nav buttons: px-4 py-2 text-sm font-semibold rounded-xl (consistent) (31-01-2026)
- [x] Primary actions: font-bold met accent kleuren (consistent) (31-01-2026)
- [x] Modals: rounded-3xl container met rounded-xl buttons (consistent) (31-01-2026)
- [x] cursor-pointer op alle interactieve elementen (consistent) (31-01-2026)
- [x] disabled:cursor-not-allowed waar van toepassing (consistent) (31-01-2026)

---

## Stap 12: Code review, testen en bugfixes
Status: **VOLTOOID** (31-01-2026)

### Bug gevonden en gefixt
- [x] **Loop-functionaliteit niet verbonden met Tone.Transport** (31-01-2026)
  - isLooping state in timelineStore werd getoggeld maar Tone.Transport.loop werd niet gezet
  - Fix: setTransportLoop() functie toegevoegd aan useAudioEngine
  - StudioView handlePlay() zet nu transport loop voor afspelen
  - StudioView handleToggleLoop() update ook transport direct (werkt tijdens playback)

### Code review bevindingen
| Check | Status | Details |
|---|---|---|
| Audio context user gesture | OK | initAudio() in StartScreen bij "Start Spel" klik |
| Sample double-add preventie | OK | isSampleInRecorder + isSampleCollected + isRecorderFull |
| Clip overlap preventie | OK | addClip() checkt startBeat collision |
| Cleanup on unmount | OK | Transport stop + cancel + player dispose in useEffect cleanup |
| Recorder → Library flow | OK | transferRecorderToLibrary() bij "Naar Studio" |
| Nieuwe compositie = schone lei | OK | clearLibrary() + clearAllTracks() |
| Promise.allSettled bij bulk loading | OK | Graceful failure bij ontbrekende audio files |
| DnD click/drag conflict | OK | PointerSensor distance: 8 + stopPropagation op preview knop |

### Edge case analyse
| Scenario | Afhandeling |
|---|---|
| Lege library naar studio | SampleLibrary toont empty state; "Naar Club" disabled |
| Dubbel klik op hotspot | Hotspot disabled na addToRecorder (isSampleInRecorder check) |
| Drop op bezette beat | addClip() retourneert false, clip niet toegevoegd |
| Play zonder clips | Play knop disabled via hasClips check |
| Navigatie weg tijdens playback | stopAll()/stopTimeline() bij elk navigatie-event |
| Audio file niet gevonden | console.warn, graceful skip, geen crash |
| Toggle loop tijdens playback | setTransportLoop() update transport direct |

### Build resultaat
- `npm run build`: Succesvol (1050 modules, 1.94s)
- Bundle: 549KB JS (incl. Tone.js), 41KB CSS
- Geen TypeScript errors
- Chunk size warning (>500KB): verwacht door Tone.js bundling

---

## Samenvatting Fase 3

### Bestanden gewijzigd (Stap 10-12)
| Bestand | Wijziging |
|---|---|
| src/stores/libraryStore.ts | clearLibrary() action toegevoegd |
| src/hooks/useAudioEngine.ts | setTransportLoop() functie toegevoegd |
| src/components/studio/StudioView.tsx | Loop integratie, cleanup ongebruikte code |
| src/components/studio/Timeline.tsx | Variable shadowing fix (t → tr) |
| src/components/location/RecorderBar.tsx | Responsive min-width + touch target fix |
| src/components/club/ClubView.tsx | clearLibrary() + cancel knop fix |
| src/index.css | Focus-visible a11y styling |
| src/i18n/locales/nl.json | club.cancel key |
| src/i18n/locales/en.json | club.cancel key |

### Volgende stappen (buiten scope MVP)
- Echte MP3 audio bestanden toevoegen
- Meerdere locaties (haven, markt, bos)
- LocalStorage persistentie voor composities
- Share/export functionaliteit
- Performance: lazy-load Tone.js + code splitting
