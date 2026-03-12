# SoundScout — Todo's

**Laatst bijgewerkt**: 2026-03-12

---

## Inbox (handmatig toegevoegd)

> Plaats hier ideeën, bugs of verzoeken. Claude verwerkt ze later naar de juiste prioriteit.

- [ ] Onderzoek hoe complex het is om met virtual reality / 360° beelden te werken (#46)

---

## Open issues

### P2 — Hoge prioriteit

#### #16 — Touch Gevoeligheid & Autoplay Issues
**Complexiteit:** Medium-Hoog · **Bron:** Docent feedback (2026-02-03)

Problemen op tablets en mobiles: touch targets, drag threshold, autoplay beleid, dubbele touch events. Vereist testen op iPad, Android en Chromebook.

Huidige sensor config:
```typescript
useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
```

#### #41 — Soundscape Storytelling — restpunten
**Status:** Fase A–D ✅ afgerond (2026-03-11) · **Plan:** `docs/PLAN-41-STORYTELLING.md`

Resterende items uit Fase D:
- [ ] D.4 — Docent template-integratie (docent kan storyboard meegeven bij template)
- [ ] D.7 — Edge cases testen: thema zonder storyboards, storyboard met 1 afbeelding, resize

#### #48 — Video-Storyboard (Compositie bij Video)
**Complexiteit:** Zeer Hoog · **Afhankelijk van:** #41 ✅ · **Status:** Onderzoeksfase

Video afspelen i.p.v. stilstaande afbeeldingen in het storyboard-systeem. Vereist onderzoek naar HTML5 video sync met Tone.js, hosting, performance en mobile support.

#### #49 — Storyboard/Afbeelding in Docentenviewer
**Complexiteit:** Medium · **Afhankelijk van:** #41 ✅, #21 ✅

Docent kan storyboard/afbeelding-composities bekijken in het dashboard met de afbeeldingen erbij, zodat projectie in de klas mogelijk is. `storyboardId` wordt al meegestuurd bij delen; de viewer moet dit laden en tonen naast de read-only timeline.

---

### P3 — Middel prioriteit

#### #22 — Real-time Geluiden Toevoegen tijdens Afspelen
**Complexiteit:** Zeer Hoog · **Bron:** Gebruiker feedback (2026-02-05)

Tijdens playback nieuwe samples op de timeline kunnen slepen die direct meespelen. Technische uitdaging: Tone.Part dynamisch updaten terwijl transport loopt.

#### #27 — Locatie Editor Verbeteringen
**Complexiteit:** Laag · **Status:** Basisfunctionaliteit bestaat

MP3 upload direct koppelen aan samples + drag-and-drop hotspot herpositionering.

#### #28 — Eigen Samples Opnemen
**Complexiteit:** Zeer Hoog

Microfoon opname in de app: permissions, real-time waveform, max 5 seconden, encode naar MP3/WAV. Vereist MediaRecorder API.

#### #33 — Sample Effecten
**Complexiteit:** Laag (types voorbereid) → Medium (UI + audio)

Per-clip effecten: volume, pitch shift, reverb, pan, filter. Types zijn voorbereid in `ClipEffects`, maar nog geen UI of Tone.js nodes.

#### #50 — Export Storyboard als Video (MP4)
**Complexiteit:** Hoog · **Afhankelijk van:** #41 ✅, #2 ✅

Storyboard-compositie exporteren als video: afbeeldingen wisselen op section-tijden + audio = MP4. Naast bestaande MP3-export. Vereist client-side video encoding (bijv. MediaRecorder + Canvas of ffmpeg.wasm).

#### #51 — Feedback-knop Prominenter op Startscherm
**Complexiteit:** Laag

Onder "Hoe werkt het" een vergelijkbare stijl tekst "Hulp nodig of bug melden?" die verwijst naar de feedback-modal. Vervangt niet het kleine icoontje onderaan, maar maakt de feedback-optie zichtbaarder.

#### #52 — Compositie Overdracht / Verder Werken op Ander Apparaat
**Complexiteit:** Medium-Hoog · **Status:** Nog niet uitgedacht

Leerlingen moeten thuis of op een andere computer verder kunnen werken aan hun compositie. Huidige opslag is localStorage (device-gebonden). Mogelijke richtingen: export/import bestand, QR-code, Supabase cloud sync, of koppeling via klascode. Nog brainstormen over de juiste aanpak.

---

### P4 — Lage prioriteit

#### #30 — Extra Locaties
**Status:** 5 locaties af, 4 nog gepland (Spookhuis, Strand, Markt, Ruimtestation)

#### #42 — Samenspel / Ensemble-modus
**Complexiteit:** Zeer Hoog · **Status:** Geparkeerd (concept)

Meerdere leerlingen op aparte devices dragen bij aan dezelfde compositie. Vereist real-time sync (Supabase Realtime), versioning, conflict resolution. Vervangt oud #32 (Multiplayer).

#### #46 — Virtual Reality / 360° Locaties
**Complexiteit:** Zeer Hoog · **Status:** Geparkeerd (onderzoeksfase)

360° panorama of VR locaties met spatial audio. Vereist browser support research, performance testing, content-creatie haalbaarheid.

---

### P5 — Backlog

#### #38 — i18n Review (Terugkerend)
Periodiek nalopen na elke feature: hardcoded teksten, NL/EN pariteit, vertaaldekking.

#### #43 — Lesbrieven & Werkvormen
Content-creatie (geen code): 4 lesbrieven met concrete muziektaken, reflectie en luisteropdrachten.

#### #44 — Luister-en-Reageer Modus
**Status:** Geparkeerd (concept) · **Complexiteit:** Zeer Hoog

Omgekeerd spel: kind hoort geluid, plaatst het op de juiste locatie op de kaart. Traint actief luisteren. Vereist nieuw interactiemodel.

---

### Overig openstaand

#### UX-4 — Kindvriendelijker vocabulaire
**Status:** Wacht op review · **Document:** `docs/WOORDENLIJST-VOCABULAIRE.md`

4 hoge-prioriteit suggesties: Compositie, Bibliotheek, Samples, Dupliceren → kindvriendelijkere alternatieven. Alleen i18n keys wijzigen, geen code.

#### UX-9 — Studio pagina indeling herbekijken
**Status:** Niet begonnen

Verhoudingen op de Studio pagina herbekijken: EditToolbar, Timeline, SampleLibrary.

#### DEPLOY-8 — Eerste deploy naar Strato
**Status:** Handmatige actie product owner · **Instructies:** `docs/DEPLOY-INSTRUCTIES.md`

#### TP3-4 — Alfanumerieke klas-codes
**Status:** Geparkeerd — pas nodig bij >1.000 actieve klassen. Vereist DB migratie.

#### TP4-1 — Split AudioService in sub-services
**Status:** Toekomstig — AudioService is een god-object. Split in AudioLoader, AudioPlayer, TimelineScheduler, AmbientAudioManager.

#### TP4-2 — Factory pattern voor AudioService
**Status:** Toekomstig — singleton maakt unit testing onmogelijk.

#### TP4-4 — Tier 2 tests: services met Tone.js mock
#### TP4-5 — Tier 3 tests: component integratie

---

## Niet implementeren

| Item | Reden |
|------|-------|
| Locked locaties | Niet nodig, vrije toegang gewenst |
| Achievements & Badges | Niet gewenst |
| Bulk afspelen | Overkill |
| CSV export | Overkill |
| Volume slider ambient | Alleen on/off nodig |
| UX-5 Studio cognitive load (auto-collapse tracks) | 8 tracks gewenst — leerlingen moeten meerstemmigheid zien |
| UX-6 StageView knoppen hiërarchie | Huidige layout voldoende |
| A11Y-5 ZoomableView keyboard | Alleen kleine schermen, geen prioriteit |
| A11Y-6 Audio zonder visueel alternatief | Niet geschikt voor deze app |
| PERF-4 Image optimalisatie | Geen merkbare laadproblemen in praktijk |

---

## Afgerond

### Technische beslissingen

| Beslissing | Keuze | Motivatie |
|---|---|---|
| State management | Zustand | Lightweight, eenvoudige API, geen boilerplate |
| Drag & Drop | dnd-kit | Moderne API, goede a11y, actief onderhouden |
| Styling | Tailwind CSS v4 | Snelle development, consistent design system |
| Audio | Tone.js | Robuuste Web Audio abstractie, scheduling |
| Build tool | Vite | Snelle HMR, optimale productie builds |
| i18n | react-i18next | Industriestandaard, lazy loading, NL als default |

### Features (per issue)

| # | Titel | Datum | Notities |
|---|-------|-------|----------|
| #1 | Nieuwe Locaties & Stadskaart | 2026-02-01 | Theme systeem, 5 locaties, voortgangsindicator |
| #2 | Audio Export als MP3 | 2026-02-01 | Tone.js Offline + lamejs, 128kbps stereo |
| #3 | Lokaal Opslaan & Beheren | 2026-02-01 | localStorage, max 10 composities |
| #4 | Responsive Design | 2026-02-01 | sm: breakpoint (640px), 44px touch targets |
| #5 | Studio Layout | 2026-02-01 | 8 tracks, timeline onderaan, flex-wrap library |
| #6 | Nieuwe Locaties Assets | 2026-02-01 | Boerderij, Speeltuin, Gymzaal, Muziekwinkel |
| #7 | Design System & Styling | 2026-02-02 | 60-30-10 kleurregel, "Club" → "Stage" |
| #8 | Teacher Dashboard Verbeteringen | 2026-02-02 | Read-only timeline, fullscreen modal |
| #9 | StartScreen Branding | 2026-02-02 | Logo, favicon, footer, social links |
| #10 | Klas-code Systeem | 2026-02-03 | Supabase auth, RLS, 4-cijferige codes |
| #11 | Hotspot Animaties | 2026-02-03 | Pulse, hover, active, collected states |
| #12 | Clip Trimming & Smart Snap | 2026-02-03 | 7-fase roadmap, waveform, modal. Docs: `ROADMAP-CLIP-TRIMMING.md` |
| #13 | Thema Selectie Modal | 2026-02-10 | Grid met kaartjes, hover effect |
| #14 | Delen met Link | 2026-02-27 | Share codes (8 chars), 30 dagen geldig. Docs: `PLAN-DELEN-MET-LINK.md` |
| #15 | Emergency/Feedback Systeem | 2026-02-05 | EmailJS, rate limiting, context collectie |
| #17 | Playhead Seeking | 2026-02-04 | Hybride aanpak: actieve clips direct + Tone.Part. Docs: `ROADMAP-PLAYHEAD-SEEKING.md`, `TONEJS-KENNISBANK.md` |
| #18 | Ambient Audio | 2026-02-03 | Tone.Player, -15dB, fade in/out |
| #20 | Vereenvoudigde Transport Controls | 2026-02-05 | Play/Pause + Rewind + Loop |
| #21 | Template Systeem voor Docenten | 2026-02-28 | Docent maakt template, leerling laadt in |
| #23 | Getrimde Clip Kopiëren/Dupliceren | 2026-02-05 | Ctrl+D, smart snap plaatsing |
| #26 | Ambient Audio Cleanup & Pause/Stop Fix | 2026-02-26 | Fade timeout leak fix |
| #31 | Beat Ruler met Maatnummers | 2026-02-27 | Maatnummers 1-32 boven timeline |
| #34 | Sample Wis Knop UI | 2026-02-27 | |
| #35 | Tweetalig Systeem (i18n Audit) | 2026-02-27 | ~150 keys, LanguageSwitcher, localStorage |
| #36 | Playhead Seeking Docenten Viewer | 2026-02-27 | Hergebruik Playhead in read-only |
| #37 | Grijs Leeg Gedeelte Verwijderen | 2026-02-27 | `min-h-screen` → `h-dvh overflow-hidden` |
| #39 | Volume per Track + Clip Volume/Mute | 2026-02-27 | dB-based, geen persistent Gain nodes |
| #40 | Scène-markering op Timeline | 2026-02-28 | SectionBar, flags, labels, kleuren |
| #41 | Soundscape Storytelling (Fase A–D) | 2026-03-11 | URL flag, compose-mode, split-view, podium sync, persistence. Docs: `PLAN-41-STORYTELLING.md` |
| #45 | Wis Tijdlijn Knop | 2026-03-11 | Eraser icon, inline confirm |
| #47 | Sectie Drag Resize | 2026-03-12 | Drag handles op sectie-grenzen, vrij slepen (0.5 beat snap), min 2 beats, werkt in storyboard- én vrije modus |

### Technische schuld (afgerond)

| ID | Titel | Datum |
|----|-------|-------|
| TP0-1 | Vervang `any` door `CompositionData` | 2026-02-27 |
| TP0-2 | Rate limiting submissions | 2026-02-27 |
| TP0-3 | CHECK constraints Supabase | 2026-02-27 |
| TP0-4 | max_classes enforcement | 2026-02-27 |
| TP1-1 | Split StageView.tsx | 2026-02-27 |
| TP1-2 | Ambient audio fade timeout leak | 2026-02-27 |
| TP1-3 | Error handling async hooks | 2026-02-27 |
| TP1-4 | Feature-level Error Boundaries | 2026-02-27 |
| TP1-5 | Orchestratie compositionInit | 2026-02-27 |
| TP2-1 | gameStore → appStore migratie | 2026-02-27 |
| TP2-2 | libraryStore redundante state | 2026-02-27 |
| TP2-3 | SmartSnapResult error context | 2026-02-27 |
| TP2-4 | Extraheer usePanZoom() | 2026-02-27 |
| TP2-5 | Extraheer useStudioKeyboardShortcuts() | 2026-02-27 |
| TP2-6 | timelineStore parameter bloat | 2026-02-27 |
| TP2-7 | Zod data validatie | 2026-02-27 |
| TP3-1 | Memoized selectors timelineStore | 2026-02-27 |
| TP3-2 | Player cache opschoning | 2026-02-27 |
| TP3-3 | StorageService faal-feedback | 2026-02-27 |
| TP3-5 | Gevoelige data uit console.error | 2026-02-27 |
| TP4-3 | Tier 1 tests (209 tests) | 2026-02-27 |

### UX & Accessibility (afgerond)

| ID | Titel | Datum |
|----|-------|-------|
| UX-2 | Undo/Redo (Ctrl+Z) | 2026-02-27 |
| UX-3 | Succes-animatie sample verzamelen | 2026-02-27 |
| UX-7 | EditToolbar touch targets 44px | 2026-02-27 |
| UX-8 | Klascode projector-modus | 2026-02-27 |
| A11Y-1 | DnD keyboard alternatief | 2026-02-27 |
| A11Y-2 | Playhead accessible (role=slider) | 2026-02-27 |
| A11Y-3 | Timeline screen reader | 2026-02-27 |
| A11Y-4 | Clips role + keyboard | 2026-02-27 |
| A11Y-7 | Quick wins (aria, focus trap, labels) | 2026-02-27 |

### Performance & Deployment (afgerond)

| ID | Titel | Datum |
|----|-------|-------|
| PERF-1 | Route-level code splitting | 2026-02-27 |
| PERF-2 | currentBeat re-render fix | 2026-02-27 |
| PERF-3 | Vite build manualChunks | 2026-02-27 |
| PERF-5 | Timeline grid memoization | 2026-02-27 |
| DEPLOY-1 | SEO meta tags + Open Graph | 2026-02-27 |
| DEPLOY-2 | PWA manifest | 2026-02-27 |
| DEPLOY-3 | Caching headers audio | 2026-02-27 |
| DEPLOY-4 | `<html lang="nl">` | 2026-02-27 |
| DEPLOY-5 | Content Security Policy | 2026-02-27 |
| DEPLOY-6 | Favicon pad fix | 2026-02-27 |
| DEPLOY-7 | Environment-specifieke builds | 2026-02-27 |

### Initiële implementatie (Stap 0–12)

Alle stappen van het oorspronkelijke project (31-01-2026):
types, data, stores, audio engine, startscherm, locatie-scherm, studio, podium, navigatie, styling, code review.
Zie git history voor details.
