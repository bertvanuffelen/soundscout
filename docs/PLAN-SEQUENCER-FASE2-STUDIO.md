# Plan — Sequencer fase 2: studio-integratie (ontwerpbesluiten)

> Status: **GEBOUWD (2026-07-30)** — na de fast-forward-merge van de
> masterplan-branch (Audio Engine v2) naar `main` en rebase van
> `feature/sequencer-lab`. Alle besluiten hieronder zijn geïmplementeerd
> zoals beschreven. **Sinds 9-8 staat de sequencer voor iedereen aan** — de
> dev-vlag `sequencer` is verwijderd bij de samenvoeging naar `main`.
> Fase 1 (het lab op `/sequencer`) blijft daarnaast gewoon werken.

## Kernidee: "rustig tenzij"

De studio blijft pixel-voor-pixel zoals hij is. De sequencer verschijnt pas
wanneer er bewust een sequence wordt toegevoegd of geopend — en in de testfase
alleen voor Bert (admin/dev-vlag). *Achterhaald sinds 9-8: de vlag is weg.*

## Vastgestelde besluiten

### UI

1. **Eén flexibele tijdlijn-werkbalk** (geen aparte tab-balk erboven):
   - Links: tabs **Montagelijn | [sequence-naam] ✕** op de plek waar nu het
     label TIJDLIJN staat. De sequence-tab bestaat alléén zolang er een
     sequence geopend is (✕ of terugklikken sluit hem; de sequence zelf blijft
     bewaard).
   - Midden: contextbalk — clip-acties bij selectie (bestaand gedrag).
   - Rechts, **modus-afhankelijk**:
     - Montagelijn-modus: paarse "＋ sequence"-knop (raster-icoon, alleen met
       vlag) + vlag/gum/zoom/undo/redo (bestaand).
     - Sequencer-modus: hernoem / dupliceer / verwijder + lengte − "16 tellen ·
       4 maten" +.
   - Balk-hoogte identiek in beide modi (niets verspringt); knoppen die in
     beide modi bestaan houden dezelfde positie.
2. **Sequencer-panel neemt de héle tijdlijnzone over** (incl. werkbalkinhoud).
   Beeld/storyboard en bibliotheek erboven blijven gewoon staan
   (echte layout: **bibliotheek links, beeld rechts**).
3. **Spoorbediening** links per rij (geluid-pill, Uitklinken/Afkappen, volume,
   trim-schaar, verwijderen); **"+ spoor"** onderin het grid (max 8).
4. **Transport**: de bestaande grote transportbalk onderaan is modus-bewust.
   Sequencer-tab actief → play kleurt paars en speelt **de sequence**
   (rondlopend; loop staat vast aan). Montagelijn-tab → play speelt de
   compositie (bestaand gedrag). Eén transport, twee contexten.
5. **Bibliotheek**: elke sequence is een paarse bundel-chip (raster-icoon,
   gestippelde rand). **Meerdere sequences per compositie.** Chip aanklikken =
   openen in de tab (tabnaam wisselt mee); chip slepen = plaatsen op een spoor.
6. **Sequence-clip op de montagelijn**: blokjespatroon-uiterlijk;
   rechterhandvat uitrekken = patroon herhaalt (bestaand loop-clip-gedrag →
   dupliceren/volume gratis). Clip-bewerkbalk toont: label, dupliceren,
   volume, **"patroon bewerken"** (opent de sequencer-tab), verwijderen.
   Géén trim/effecten op sequence-clips in v1.
7. Sequence bewerken = **levend**: verandert elke geplaatste instantie.

### Scope & gating

8. **Admin-only in de testfase** *(vervallen 9-8 — vlag verwijderd)*: derde
   vlag `sequencer` in `devFlagsStore` (naast `sections`/`templates`, aan via
   `?dev=true`). Vlag uit → studio
   identiek aan nu; composities mét sequence-clips blijven voor iedereen
   afspeelbaar (patroon wordt bij inplannen uitgepakt naar gewone events).
9. **Alle compositiemodi**: vrij, bij afbeelding, storyboard én praatplaat.
10. **Opslag meteen volledig**: sequence-data wordt geëmbed in de compositie
    (localStorage + Supabase JSONB) zodat bewaarcode, delen en inleveren
    direct werken. Schema-sync-punten (vaste checklist): `ClipSchema` +
    `CompositionDataSchema`/`SavedCompositionSchema` (utils/schemas.ts),
    veldkopie in `duplicateClip`, `tracksEqual` in `useUndoRedoTimeline`,
    `audioVersion`-bump bij elke hoorbare sequence-mutatie.

### Audio & export

11. Pattern-uitpakken gebeurt in de **v2 event-generatie**
    (`audioEvents.generateEvents()`, die al loop-clips uitpakt) via het pure
    `generatePatternEvents` uit fase 1 → live afspelen, MP3- én video-export
    lopen automatisch via dezelfde route (incl. master-limiter en
    export-validator).
12. Op de montagelijn volgt het patroon het **tijdlijntempo** (120), zodat
    vakjes op tellen vallen. (BPM-slider in het lab = later, los besluit.)
13. In sequencer-modus speelt de eigen `SequencerEngine` (eigen klok) — nooit
    de globale transport.

### Volgorde

14. **Eerst**: masterplan-branch (Audio Engine v2) naar `main` mergen.
    **Dan**: `feature/sequencer-lab` rebasen/mergen en fase 2 bouwen tegen v2.
    Testen kan doorlopend via eigen dev-server (poort 5188) + vlag.

## Open punten (bewust nog niet besloten)

- ~~Leerling-naam van de feature~~ — **besloten 30-7**: overal "sequencer",
  ook richting leerlingen; uitgelegd via een eerste-keer-tip en de
  docentenhandleiding. Zie `docs/WOORDENLIJST.md` §Sequencer.
- **Positionering besloten 30-7**: gereedschap bínnen de drie compositievormen
  (vrij / praatplaat / storyboard), géén vierde vorm en géén vijfde
  opdrachttype. De landing houdt "drie manieren om te componeren".
- Undo/redo binnen de sequencer-tab (v1 lab heeft het niet; togglen is
  zelf-herstellend).
- Wat als een sequence verwijderd wordt terwijl er clips van op de montagelijn
  staan → voorstel: bevestiging + clips mee verwijderen.
- Kanttekening testdata: composities mét sequence die geladen worden in een
  build zonder de nieuwe schema's verliezen de sequence-velden (Zod stript
  onbekende keys). Alleen relevant vóór de schema's gemerged zijn.

## Referenties

- Fase 1-plan en verantwoording: plan "Step Sequencer Lab" (sessie 2026-07-30)
- Lab-code: `src/pages/SequencerLab.tsx`, `src/components/sequencer/*`,
  `src/services/SequencerEngine.ts`, `src/services/sequencerEvents.ts`
- v2-architectuur: `docs/audio/PLAN-AUDIO-ENGINE-V2.md` (masterplan-branch),
  `src/services/audioEvents.ts` / `audioGraph.ts` aldaar
