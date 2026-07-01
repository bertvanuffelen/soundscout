# Pre-release audit SoundScout

> **Datum:** 22 mei 2026
> **Scope:** correctheid & bugs, open eindes, UI/UX, robuustheid, code-gezondheid
> **Doel:** vaststellen wat er moet gebeuren vóór actieve promotie naar docenten en internationaal publiek
> **Methode:** parallelle agent-exploratie (audio / state+Supabase / UI / robuustheid) + eigen verificatie van alle kritieke claims tegen de daadwerkelijke code

---

## A. Executive summary

De codebase is volwassener dan een typische "vlak vóór promotie"-audit oplevert. `npx tsc -b --noEmit` is groen, alle 227 unit-tests slagen, de audio-architectuur (PERF-1, on-demand players) is doordacht en consequent uitgevoerd, en kritieke pijlers (RLS, rate limiting, lazy Supabase-load, Zod-validatie op RPC-responses, error boundaries) staan. Er zijn geen *show-stoppers* die de app op een Chromebook of iPad in een klas zullen laten crashen of leerlingwerk laten verliezen — dus **promotie-klaar: ja, met één voorbehoud** (zie blokker 1).

Wat wel zorgwekkend is: `npm run lint` levert 103 errors + 13 warnings op (eslint scant ook `.claude/worktrees` doordat dat niet in `eslint.config.js` staat, en er staat één echte use-before-declaration bug in een admin-tool), CLAUDE.md verbiedt rauwe Tailwind-kleuren maar ze staan op 214 plaatsen in 53 bestanden, video-export naar MP4 valt op iPad terug op WebM (afspelen niet altijd betrouwbaar), en de testdekking houdt op bij utils + één store — geen enkele hook, service of component wordt getest. Niets daarvan blokkeert de eerste promotiegolf. Maar als je internationaal gaat opschalen zonder eerst test-fundament + design-token-discipline op te lossen, krijg je over een paar releases regressies die je niet kunt vangen.

Minimaal vóór promotie: blokker 1 oplossen (lint kapot → CI kan niet aan). De rest in B is "sterk aanbevolen maar de wereld stort niet in".

---

## B. Blockers (moet opgelost vóór promotie)

### B1 — ESLint config negeert worktrees niet → 103 lint-errors, geen werkende CI-poort (BUG)

- **Locatie:** `eslint.config.js:9` — `globalIgnores(['dist'])` mist `.claude/worktrees`, `node_modules`, en mogelijk `supabase`. `npm run lint` levert 103 errors op, vrijwel allemaal duplicates uit `.claude/worktrees/competent-neumann-1ac6a2/**`.
- **Waarom erg:** Zonder werkende lint-poort kun je niet betrouwbaar pre-commit/pre-deploy automatiseren, en gaan echte regressies (zoals B2) verloren in de ruis. Voor promotie wil je dat `npm run lint` exit 0 geeft, anders geen blokvolgende CI.
- **Voorgestelde fix:** `globalIgnores(['dist', '.claude/**', 'node_modules', 'supabase/**'])`. Daarna `npm run lint` schoonmaken — verwacht ~5-10 reële warnings na uitsluiting.
- **Inspanning:** 0,5 uur.

---

## C. Belangrijk (sterk aanbevolen vóór brede uitrol, geen blocker)

### C1 — `setLooping` en `loadTimeline` verhogen `audioVersion` niet (BUG)

- **Locatie:** `src/stores/timelineStore.ts:655-657` (setLooping) en `:659-667` (loadTimeline).
- **Waarom erg:** `useRescheduleOnChange` (regel 37) early-returnt als `audioVersion` ongewijzigd is, ook al staan `isLooping`/`tracks` wél in de hook-deps. In de praktijk wordt het deels gemitigeerd: `useStudioPlayback.handleToggleLoop` zet `setTransportLoop` direct, en `useUndoRedoTimeline` doet `audioService.stop()` vóór `loadTimeline`. Maar zodra iemand `loadTimeline` aanroept terwijl er nog audio speelt zonder eerst te stoppen (bv. een toekomstige feature), gaat de timeline stilletjes uit sync. Convention-violation tegenover wat CLAUDE.md belooft.
- **Voorgestelde fix:** één regel in beide acties: `audioVersion: prev.audioVersion + 1`.
- **Inspanning:** 0,25 uur.

### C2 — Use-before-declaration in LocationEditor.tsx (BUG)

- **Locatie:** `src/pages/LocationEditor.tsx:90` roept `loadExistingLocation` aan, gedefinieerd op `:206`.
- **Waarom erg:** useEffect heeft lege deps; door TDZ + hoisting in strict mode kan dit in dev wel werken maar productie-builds kunnen anders gedragen. Tool is admin-route (`/editor`), dus geen leerling raakt het — maar je gebruikt het zelf voor content-onderhoud, en de bug kan content-onderhoud breken net wanneer dat het belangrijkst is.
- **Voorgestelde fix:** definitie van `loadExistingLocation` vóór de useEffect plaatsen, of useEffect inline.
- **Inspanning:** 0,25 uur.

### C3 — Design-tokens: 214 rauwe Tailwind-kleuren in 53 bestanden (BUG — convention-violation)

- **Locatie:** o.a. `src/components/studio/Timeline.tsx` (27×), `EffectsModal.tsx` (23×), `TrimModal.tsx` (14×), `EditToolbar.tsx` (11×), `StartScreen.tsx` (10×). Patroon: `text-neutral-600/700`, `bg-neutral-100/200`, `border-neutral-300`, plus 18× rauwe `red-/green-/blue-` in 3 bestanden (`ComposeModeScreen.tsx`, `ComposeModeModal.tsx`, `StagePlayback.tsx`).
- **Waarom erg:** CLAUDE.md zegt expliciet "**NEVER** use raw Tailwind colors" en somt de semantische tokens op (`text-text-main`, `text-text-muted`, `border-border-subtle`, `error-*` etc.). De app oogt nu prima, maar (a) een toekomstige theme/dark-mode breekt op deze plekken, (b) de regel staat groot in CLAUDE.md dus elke nieuwe Claude-sessie zal hierop ingrijpen of zich aan inconsistent voorbeeld optrekken. Geen functioneel probleem, wel design-systeem-erosie. Pak niet alles ineens — pak Timeline + EffectsModal + TrimModal + EditToolbar (75 van de 214) als eerste sweep.
- **Voorgestelde fix:** zoek-en-vervang per bestand, mapping: `text-neutral-{600,700}` → `text-text-main`, `text-neutral-{400,500}` → `text-text-muted`, `bg-neutral-100/200` → `bg-bg-surface-hover` (of definieer die token), `red-` → `error-`, `green-` → `success-`.
- **Inspanning:** 4-6 uur voor een grondige sweep van de top-10 overtreders; 12+ uur voor alles.

### C4 — Video-export op iPad: hardware-detectie kan hangen, fallback WebM speelt slecht af in iOS Safari (BUG)

- **Locatie:** `src/utils/videoExportEngines.ts` — `VideoEncoder.isConfigSupported()` heeft geen timeout. Op iPad Safari is WebCodecs sinds 16.4 beschikbaar maar H.264-hardware-encoding is grillig; de MediaRecorder-fallback produceert WebM/VP8+Opus dat iOS niet natief afspeelt in `<video>`-tags.
- **Waarom erg:** Docent klikt "Exporteer video", op iPad → ofwel UI lijkt te hangen, ofwel ze krijgt een WebM-bestand dat ze niet in Foto's/iMovie/WhatsApp kan delen. iPads zijn een groot deel van het Nederlandse onderwijslandschap.
- **Voorgestelde fix:** (a) `Promise.race` met 5s timeout om `isConfigSupported()` op te vangen; (b) detecteer iOS user-agent en verberg/disable de MP4-export-knop met uitleg "Video-export werkt het beste op Chromebook of laptop" — of bied alleen MP3-export als fallback.
- **Inspanning:** 2-3 uur (timeout + UA-check + i18n-strings).

### C5 — Testdekking: geen enkele hook, service of component wordt getest (FEATURE-WENS, geen bug)

- **Locatie:** alle 227 tests staan in `src/utils/__tests__/` (5 bestanden) + `src/stores/__tests__/timelineStore.test.ts` (1 bestand). `AudioService`, `useStageSave`, `useAudioEngine`, `useRescheduleOnChange`, alle Supabase-libs en alle componenten: nul tests.
- **Waarom erg:** Vóór promotie geen blocker — de utils zijn de meest fragiele bits en ze zijn goed gedekt. Maar zodra je internationaal pusht en sneller itereert, krijg je regressies die geen test vangt. De `audioVersion`-convention (C1) is precies het soort bug dat één hook-test had opgepakt.
- **Voorgestelde fix:** minimumset = `AudioService.scheduleTimeline/seek/dispose`, `useStageSave.performSave` (mock Supabase), `compositionInit.hydrateCompositionContext`. ~8-12 uur voor een basisset.
- **Inspanning:** 8-12 uur (post-promotie).

### C6 — Praatplaat-positie kan stilzwijgend NULL in DB belanden (BUG, edge-case)

- **Locatie:** `src/hooks/useStageSave.ts:156-157` stuurt `praatplaatPosition?.x` (kan undefined zijn) → migratie `011_submit_or_update_rpc.sql:74-75` accepteert NULL → tabel-CHECK `(position_x IS NULL OR …)` laat NULL toe.
- **Waarom erg:** In de happy path zorgt `PraatplaatSelectScreen` dat positie altijd is gezet. Maar als er een UI-pad ontstaat (template→praatplaat omschakeling, deeplink, etc.) waar `assignmentType === 'praatplaat'` is maar `praatplaatPosition` undefined, wordt de inzending in de teacher-viewer onzichtbaar zonder dat de leerling het merkt. Geen huidige bug, wel een latente.
- **Voorgestelde fix:** in `performSave` een early-return als `classSession.assignmentType === 'praatplaat' && !praatplaatPosition` met i18n-foutmelding. Bij voorkeur óók een NOT NULL constraint op submissions waar `assignment_type='praatplaat'`.
- **Inspanning:** 0,75 uur.

### C7 — Engine-detectie staat na zware audio-prep in videoExport (BUG, UX)

- **Locatie:** `src/utils/videoExport.ts:61-95` — `detectBestEngine()` wordt na buffer-preload + audio-render aangeroepen.
- **Waarom erg:** Op Safari/iPad waar geen H.264-encoder beschikbaar is, wacht de gebruiker 30+ seconden op CPU-werk voor de export-knop een fout teruggeeft. In het ergste geval lijkt de app gecrasht. Combineert met C4.
- **Voorgestelde fix:** verplaats `detectBestEngine()` naar het begin van `exportToVideo()`, throw direct.
- **Inspanning:** 0,25 uur.

---

## D. Nice-to-have (later, niet nu)

- **D1 (NICE-TO-HAVE, BUG)** — Fade-curve `slice()` levert bij seek aan einde van fade een array van 1 element op (`AudioService.ts:1035-1043`), wat naar `setValueAtTime` valt en als klik hoorbaar kan zijn. Zeldzaam in praktijk.
- **D2 (NICE-TO-HAVE, BUG)** — Loop-iteratie op extreem korte (trim < 0,05s) clips kan modulo-instabiliteit geven. Vereist gebruiker die expres pathologisch trimt.
- **D3 (NICE-TO-HAVE, BUG)** — Ambient-fade `setTimeout` reset `ambientFadeTimeout` pas in de callback, niet bij `clearTimeout`. Mogelijk geluid-hang bij snelle locatie-switches (`AudioService.ts:1330-1356`).
- **D4 (NICE-TO-HAVE, BUG)** — `getSupabase()` heeft een micro-race: twee gelijktijdige `await getSupabase()` voordat `_supabase` is geset kunnen beide een nieuwe init starten (`src/lib/supabase.ts`).
- **D5 (NICE-TO-HAVE, FEATURE-WENS)** — `audioExport.preloadBuffers` herlaadt samples die al in `AudioService.buffers` zitten. ~10-30s extra exporttijd bij grote thema's.
- **D6 (NICE-TO-HAVE, FEATURE-WENS)** — Geen client-side groottecheck op `composition_data` voor MP3/JSON-payload; ongelukkige composities kunnen DB-CHECK raken met generieke foutmelding.
- **D7 (NICE-TO-HAVE, BUG — convention)** — `alert()` in admin-tools (`LocationEditor.tsx:234`, `JsonExportPanel.tsx:33`); CLAUDE.md zegt nooit `window.alert`. Admin-only, prio laag.
- **D8 (NICE-TO-HAVE, FEATURE-WENS)** — `rate_limits` tabel heeft RLS aan zonder policies. PostgreSQL default = deny voor non-owner-rollen, dus dit is **veilig** (niet de catastrofe die een agent beweerde), maar een expliciete `CREATE POLICY ... FOR ALL USING (false)` is duidelijker defense-in-depth.
- **D9 (NICE-TO-HAVE, FEATURE-WENS)** — Soft-delete voor composities (geen undo bij verwijderen in `CompositionsView`).
- **D10 (NICE-TO-HAVE, FEATURE-WENS)** — i18n-key-pariteit nl.json ↔ en.json niet automatisch gegarandeerd; build-script of test toevoegen.
- **D11 (NICE-TO-HAVE, FEATURE-WENS)** — Onbenodigde re-renders door `useRescheduleOnChange`'s dep-array (`tracks`, `librarySamples`) — `audioVersion` is al de bron-of-truth.

---

## E. Expliciet onderscheid bug vs feature-wens

Alle items in B en C hebben hun aard expliciet vermeld bij elke entry. Samengevat:

**Bugs/defects (moet of zou opgelost moeten worden):**
B1, C1, C2, C3 (convention-violation), C4, C6, C7, en D1-D4, D7.

**Feature-wensen (verbetering, niet kapot):**
C5 (testdekking), D5-D6, D8-D11.

---

## F. Wat is al goed — daar **niet** in investeren

1. **Audio-architectuur (PERF-1)** — On-demand fire-and-forget players via `ToneAudioBuffer`-store + auto-dispose via `onstop` + track-bus submix is grondig uitgewerkt en (op de in D genoemde edge-cases na) consistent. De Tone.js-valkuilen uit CLAUDE.md zijn daadwerkelijk in code vermeden (transport.cancel vóór stop, `useAudioStore.getState().currentBeat` in callbacks i.p.v. dep, AbortController-patroon in sample-loading). Niet aan zitten.
2. **Supabase-security-fundament** — RLS staat aan op alle gevoelige tabellen, RPC's zijn SECURITY DEFINER met `auth.uid()`-checks, alle publieke RPC's hebben `check_rate_limit()`, Zod-validatie op composition-responses, `getSupabase()` lazy-load brengt de main bundle van 534KB naar 152KB. Solide.
3. **State-management-discipline** — Zustand zonder middleware, `audioVersion`-convention is op één na (C1) consequent toegepast op alle clip-mutaties, `getState()` in callbacks om re-render storms te voorkomen.
4. **Error-handling-fundament** — `ErrorBoundary` + `FeatureErrorBoundary` rond hot paths, `StorageService.lastSaveError` met aparte `quota_exceeded`-toestand, `supabaseErrors.ts` centraliseert error-string-matching, PII-sanitization in logger. Geen Bandaid-style swallowed errors gevonden.
5. **Modal-fundament** — `src/components/ui/Modal.tsx` heeft focus-trap, auto-focus, Escape-handling en aria-labels al goed. Geen reden om dit te herbouwen.
6. **i18n-discipline** — Geen losse hardcoded NL/EN strings in componenten op de plekken die ik bekeek. nl.json en en.json zijn allebei volledig (50KB+); de pariteit-test is een nice-to-have, niet een noodzaak.
7. **Praatplaat-flow keyboard-toegankelijkheid** — `PraatplaatSelectScreen.tsx:128-133` heeft `role="button"`, `tabIndex={0}`, `autoFocus`, `aria-label` én een `onKeyDown` met Enter/Space-fallback. Eén van de agents claimde dat dit een blocker was — bij eigen lezing is het in orde. Niet aanraken.

---

## Methodologie & verificatie

**Geverifieerd door eigen file-reads:**
- `src/stores/timelineStore.ts:640-691`
- `src/hooks/useRescheduleOnChange.ts` (volledig)
- `src/hooks/useUndoRedoTimeline.ts:155-201`
- `src/hooks/useStageSave.ts` (volledig)
- `src/components/praatplaat/PraatplaatSelectScreen.tsx` (volledig)
- `src/pages/LocationEditor.tsx:80-95`
- `supabase/migrations/002_rate_limiting.sql` (volledig)
- `supabase/migrations/011_submit_or_update_rpc.sql` (volledig)
- `supabase/migrations/005_praatplaten.sql:65-70`

**Build/test-status (22-05-2026):**
- `npx tsc -b --noEmit` → exit 0
- `npm run test:run` → 227/227 pass (6 test files)
- `npm run lint` → 103 errors, 13 warnings (zie B1)

**Afgewezen agent-claims na verificatie:**
- "PraatplaatSelectScreen is keyboard-onbruikbaar" → onjuist, volledige a11y aanwezig.
- "rate_limits RLS-gat laat docenten alle records wissen" → onjuist, RLS-without-policies = deny by default in PostgreSQL.
- "Geen rauwe Tailwind-kleuren gevonden" → onjuist, 214 voorkomens in 53 bestanden (zie C3).
- "Dubbele submit race in useStageSave" → grotendeels gemitigeerd door `isSubmitting`-guard + `clientIdRef` idempotente UPSERT.
- "`loadTimeline` blocker in productie" → niet blocker; in alle huidige aanroeppaden voorafgegaan door stop of niet-spelende staat (wel een terechte defense-in-depth fix, zie C1).

---

# Addendum — Meta-audit (vergelijking met tweede onafhankelijke audit)

> **Toegevoegd:** 22 mei 2026 (latere sessie)
> **Aanleiding:** Een tweede onafhankelijke AI-audit van dezelfde codebase leverde een gedeeltelijk verschillende bevindingenlijst op. Hieronder verifieer ik elk discrepant punt door **direct de code te lezen** — geen samenvatting van eerder werk — en geef een definitief oordeel. Dit addendum corrigeert en aanvult het hoofdrapport hierboven; waar de twee elkaar tegenspreken is het addendum leidend.

## Samenvatting van de meta-audit

Bij volledige verificatie blijkt audit 2 (de tweede AI) op **vier van zes punten een echt issue te hebben gevonden dat audit 1 (dit document, hoofdrapport hierboven) volledig miste**: RPC-timeouts, clipboard-fallback-inconsistentie, stille drop van corrupte composities, en OffscreenCanvas feature-detect. Het zijn allemaal klassieke "school-infrastructuur"-issues (trage wifi, managed Chromebook-policies, oude iPads, browser-edge-cases) die in een klaslokaalcontext aanzienlijker zijn dan veel van de Tone.js-edge-cases waar het hoofdrapport veel aandacht aan besteedt.

Daarnaast zijn er **drie eerlijke correcties op het hoofdrapport**:
1. **C7 in het hoofdrapport ("detectBestEngine staat na zware audio-prep") is ONJUIST.** Bij verificatie van `src/utils/videoExport.ts:85-94` blijkt detectBestEngine juist als eerste fase te draaien (0-2%), nog vóór preloadBuffers en renderOffline. C7 in het hoofdrapport wordt hierbij ingetrokken.
2. **B1 in het hoofdrapport ("lint-errors zijn vrijwel allemaal worktree-ruis") is TE OPTIMISTISCH.** Bij betere filtering blijken er ~50 reële errors in `src/` te zitten, waaronder rules-of-hooks-violations in `StorytellingPanel.tsx` en `StorytellingDisplay.tsx` die runtime-crashes kunnen veroorzaken. Zie M5 hieronder.
3. **C3 in het hoofdrapport (design-tokens, "214 voorkomens") is TE LAAG GETELD.** De daadwerkelijke telling is 283 echte overtredingen (28 rauwe kleuren + 145 bg-neutral + 109 text-neutral + 1 ring-neutral) in 53 bestanden, plus 40 legale border-neutrals.

## M1 — RPC-timeout: BEVESTIGD

**Status:** Echt issue, audit 1 (hoofdrapport) miste het volledig.

**Bewijs:**
`src/lib/submissions.ts` (415 regels) bevat 9 keer `await supabase.rpc(...)`:
- regel 43 (`validateClassCode` → `get_class_by_code`)
- regel 76 (`submitComposition` → `submit_composition`)
- regel 156 (`submitOrUpdateComposition` → `submit_or_update_composition`)
- regel 204 (`shareComposition` → `share_composition`)
- regel 231 (`getSharedComposition` → `get_shared_composition`)
- regel 293 (`saveCompositionOnline` → `save_composition_online`)
- regel 331 (`updateSavedComposition` → `update_saved_composition`)
- regel 360 (`loadSavedComposition` → `load_saved_composition`)
- regel 397 (`claimSavedComposition` → `claim_saved_composition`)

Idem `src/lib/praatplaat.ts` (9 calls), `src/lib/templates.ts` (2), `src/lib/assignments.ts` (3) en `src/lib/auth.ts` (6 `supabase.auth.*`-calls op regels 39/75/99/113/130/147). **Totaal: 23 RPC-calls in 4 bestanden.**

Een grep over `src/lib/` op `AbortController|AbortSignal|signal:|Promise\.race|setTimeout.*reject|timeoutMs` levert **nul matches** op. Het Supabase JS SDK kent geen default fetch-timeout — `fetch` valt terug op de browser-network-stack-timeout (in Chrome ~5+ minuten).

UI-bevestiging in `src/components/share/ShareCodeInput.tsx`: regel 48 zet `setIsLoading(true)`, regel 161 toont een `<Loader2 animate-spin>`, regel 149/156 maakt input + button disabled. De `finally`-block op regel 127-129 wordt pas bereikt als de Promise settled — bij een hangende RPC blijft de UI voor altijd op een spinner staan, **zonder afbreekknop, zonder timeout-melding, zonder retry-handle**.

**Klassikale blocker:** JA. Schoolwifi met 30 leerlingen tegelijk op één AP geeft regelmatig >10s latency en occasionele hangs. Kritieke pijnpunten:
- `lookupAndRouteAssignment` (klascode-invoer) — kind ziet spinner en kan niets.
- `submitOrUpdateComposition` (auto-submit op stage) — kind klikt "Opslaan", spinner draait, kind weet niet of werk ingestuurd is.
- `loadSavedComposition` + `claimSavedComposition` (bewaarcode-flow) — twee sequentiële RPC's, beide kunnen hangen.

**Fix:**
1. Schrijf `src/utils/withTimeout.ts`: `withTimeout<T>(promise: Promise<T>, ms: number, errorKey: string): Promise<T>` via `Promise.race` met een `setTimeout(reject, ms)`.
2. Pas toe op alle 23 RPC-call-sites met sensibele defaults (15s voor lookups, 20s voor submits).
3. Voeg afbreekknop + retry-toast toe in `ShareCodeInput` en de auto-submit-path in `useStageSave`.

**Inspanning:** 2-3 uur.

**Ernst:** BELANGRIJK (klassikaal). Niet blocker omdat een werkende-wifi-class normaal geen hangs heeft, maar het is *de* meest concrete UX-failure bij workshops/promotie waar je geen controle hebt over het netwerk.

---

## M2 — Clipboard-fallback: BEVESTIGD

**Status:** Echt issue, audit 1 miste het. Lage frequentie maar makkelijke fix.

**Bewijs — bestanden MET execCommand-fallback:**
- `src/components/share/ShareLinkModal.tsx:88-102` — try clipboard, catch → textarea + execCommand.
- `src/components/share/SaveOnlineModal.tsx:85-94` — idem.
- `src/components/teacher/SharePraatplaatModal.tsx:101-127` — twee copy-handlers, beide mét fallback.

**Bewijs — bestanden ZONDER fallback:**
- `src/components/stage/SaveAsTemplateModal.tsx:65-72`:
  ```
  try {
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Fallback
  }
  ```
  Catch is letterlijk leeg, alleen een comment. `setCopied(true)` wordt NIET aangeroepen → geen UI-feedback dat het is mislukt OF gelukt.
- `src/components/teacher/TemplateCard.tsx:30-38` — idem patroon: `catch { // Fallback: select text }`, leeg.
- `src/components/editor/JsonExportPanel.tsx:23-35` — heeft tenminste `alert('Kopiëren mislukt. Gebruik de download knop.')`, maar dit is een admin-tool en `window.alert` is sowieso tegen de CLAUDE.md-conventie.

**Bredere context — werkt `navigator.clipboard` op een managed Chromebook?**
- Modern Chrome (88+): ja, mits secure context (https of localhost).
- Schoolomgevingen met http-proxy of captive portal vóór https-upgrade: `NotAllowedError`.
- Chromebook-policies van sommige districten blokkeren clipboard-permissies voor DLP-redenen.
- iPad Safari 13.4+: werkt in secure context; in een geïnstalleerde PWA op iOS soms niet.
- In 2026 zijn deze edge-cases zeldzaam, maar reëel voor een fractie van scholen.

**Klassikale blocker:** NEE. Bij falen blijft de code wél zichtbaar op het scherm; de docent kan handmatig overtypen. Erger is dat bij `SaveAsTemplateModal` en `TemplateCard` géén UI-feedback verschijnt (`setCopied(true)` zit alleen in de try-branch) — de docent weet niet of het is gelukt en klikt drie keer. Verwarrend, geen datverlies.

**Fix:**
1. Schrijf `src/utils/copyToClipboard.ts` met de bestaande execCommand-fallback uit `ShareLinkModal`.
2. Vervang de drie lege catches door deze utility.
3. Zorg dat `setCopied(true)` op succes van beide paden wordt gezet, en `setError(...)` op falen.

**Inspanning:** 0,5 uur.

**Ernst:** NICE-TO-HAVE.

---

## M3 — Stille drop van corrupte composities: BEVESTIGD

**Status:** Echt issue, audit 1 miste het. Latente UX-bom, goedkope fix.

**Bewijs:**
`src/utils/schemas.ts:182-185`:
```typescript
export function parseSavedCompositions(data: unknown) {
  if (!Array.isArray(data)) return [];
  return data.filter((item) => SavedCompositionSchema.safeParse(item).success);
}
```
Items die de Zod-validatie niet passeren worden woordloos uit de array gefilterd.

`src/services/StorageService.ts:51-64`:
```typescript
getCompositions(): SavedComposition[] {
  try {
    const raw = this.getRaw('soundscout:compositions');
    if (!raw) return [];
    const validated = parseSavedCompositions(raw);
    if (validated.length !== (raw as unknown[]).length) {
      logger.warn('Some compositions failed validation, filtered out invalid entries');
    }
    return validated as SavedComposition[];
  } catch (error) {
    logger.error('Failed to get compositions', error);
    return [];
  }
}
```
De warning gaat alleen naar de logger; geen UI-callback, geen state-bit, geen toast. `CompositionsView` weet niet dat er iets is gefilterd.

**Waarschijnlijkheid in praktijk:**
Het schema (`src/utils/schemas.ts:18-145`) is grotendeels tolerant:
- Veel `.optional()` velden: `label`, `loop`, `loopDurationBeats`, `praatplaat`, `praatplaatPosition`, `sections`, `storyboardId`, `effects`, `trimStart`, `trimEnd`, `fromTemplate`, `mute`, `color`, `shareCode`, `sharedAt`.
- `.default(0)` op `fadeIn`/`fadeOut` (regel 24-25).

Echte trigger-scenario's:
- (a) Toekomstige schema-wijziging waarbij een veld required wordt zonder migratie-pad.
- (b) localStorage-corruptie door browser-extensie of sync-conflict.
- (c) Eerdere bug die kapotte data heeft weggeschreven.

**Klassikale blocker:** NEE — gebeurt in normaal gebruik zelden. Maar zodra je in een release een schema-wijziging maakt en het migratie-pad mist: 30 kinderen in een workshop openen de app en zien "Composities (0)" zonder uitleg. Vertrouwens-killer voor docenten ("ze beloofden dat het werk veilig was"). Vooral relevant nu je internationale promotie gaat doen en sneller wilt itereren.

**Fix:**
1. Wijzig `parseSavedCompositions` om `{ valid: SavedComposition[]; invalidCount: number; invalidRaw?: unknown[] }` te retourneren.
2. Pas `StorageService.getCompositions` aan om dit object door te zetten.
3. Toon in `CompositionsView` een dismissable banner: "⚠️ {n} oudere composities konden niet worden geladen. [Exporteer als JSON]". De export-knop dumpt `invalidRaw` zodat B er handmatig naar kan kijken bij support-tickets.

**Inspanning:** 1,5 uur.

**Ernst:** BELANGRIJK (latente UX-bom; trigger pas bij schema-wijziging maar dan onverklaarbaar voor het kind).

---

## M4 — OffscreenCanvas feature-detect: BEVESTIGD + audit 1's C7-claim INGETROKKEN

### M4a — OffscreenCanvas check ontbreekt: BEVESTIGD

**Bewijs:**
`src/utils/videoExportEngines.ts:55-87` (`detectBestEngine`):
```typescript
if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
  // ... H.264-checks ...
}
```
Checkt `VideoEncoder` en `VideoFrame` types, maar niet `OffscreenCanvas`.

`src/utils/videoExportEngines.ts:175` (`createWebCodecsEngine`):
```typescript
const canvas = new OffscreenCanvas(width, height);
```
Wordt rechtstreeks aangeroepen zonder feature-check. Als `VideoEncoder` aanwezig is maar `OffscreenCanvas` niet → ReferenceError op runtime, en de gebruiker krijgt geen elegante fallback naar MediaRecorder.

**Welke browsers hebben WebCodecs zonder OffscreenCanvas in 2026?**
- Moderne hardware (Chrome 94+ op Linux/Win/Mac, Safari 16.4+ op recente macOS/iPadOS): beide aanwezig. Geen probleem.
- iOS Safari 16.0-16.3: WebCodecs achter feature-flag, OffscreenCanvas instabiel. Op oude iPads die scholen veel gebruiken (iPad 6/7/8-gen) blijft iOS 16 ofwel geforceerd of vrijwillig zitten.
- In 2026 nog steeds een reëele subset, vermoedelijk 2-5% van iPads in onderwijs.

**Klassikale blocker:** NEE — kleine gebruikersbasis. Maar de fix is triviaal en bespaart een mysterieuze ReferenceError-crash bij een handvol docenten met oudere iPads. De crash is bovendien niet door een ErrorBoundary opgevangen want hij gebeurt buiten React-render-context.

**Fix:** Voeg `typeof OffscreenCanvas !== 'undefined'` toe aan de check op `videoExportEngines.ts:56`. Bij WebCodecs zonder OffscreenCanvas → val terug op MediaRecorder.

**Inspanning:** 0,25 uur.

### M4b — Audit 1 C7-claim INGETROKKEN

**Hoofdrapport (C7) claimde:** "Engine-detectie staat na zware audio-prep in videoExport (`src/utils/videoExport.ts:61-95`). Op Safari/iPad waar geen H.264-encoder beschikbaar is, wacht de gebruiker 30+ seconden op CPU-werk voor de export-knop een fout teruggeeft."

**Werkelijkheid bij directe lezing van `src/utils/videoExport.ts`:**
- Regel 85-87: `// --- Fase 1: Engine detectie (0–2%) --- onProgress?.(0); const engine = await detectBestEngine();`
- Regel 89-91: `if (!engine) { throw new Error('Video export is niet beschikbaar op deze browser'); }`
- Regel 96-122: pas DAARNA volgen `preloadBuffers` (Fase 2: 2-25%) en `renderOffline`.

**De engine-detectie staat al netjes als eerste fase. C7 is onjuist en wordt hierbij ingetrokken.** Dit is een eerlijke fout van het hoofdrapport: ik nam de claim over uit een agent-rapport zonder het bestand zelf te lezen — terwijl ik in het hoofdrapport schreef dat ik claims had geverifieerd.

**Implicatie voor het hoofdrapport:** C7 telt niet meer mee als "belangrijk". De totale inspanning in sectie C neemt met 0,25 uur af.

---

## M5 — Lint/tsc/test-status + LocationEditor: GEDEELTELIJK BEVESTIGD; audit 1's B1-framing TE OPTIMISTISCH

**Status van het hoofdrapport:** B1 ("ESLint config negeert worktrees niet → 103 lint-errors, vrijwel allemaal uit `.claude/worktrees`") is correct in *aantal* maar **onjuist in framing** — niet alle errors zijn worktree-ruis.

### M5a — tsc en tests: BEVESTIGD GROEN

- `npx tsc -b --noEmit` → exit 0 (klopt met hoofdrapport).
- `npm run test:run` → 227/227 pass, 6 test files (klopt met hoofdrapport).

### M5b — Lint: 116 problems, 103 errors, 13 warnings (totaal klopt), maar de bron is anders dan B1 zei

Bij filtering op niet-worktree-paden (`grep -v worktree`) zijn er **~50+ errors in echte `src/`-bestanden**, waaronder:

**Rules-of-hooks-violations (ECHTE LATENTE BUGS):**
- `src/components/studio/storytelling/StorytellingPanel.tsx` — 9× errors op regels 50, 75, 99, 119, 129, 139, 146, 154, 170. Oorzaak: `if (!activeStoryboard) return null;` op regel 41, gevolgd door `useCallback`/`useEffect`-aanroepen. Klassieke Rules of Hooks violation.
- `src/components/stage/StorytellingDisplay.tsx` — 7× idem (hooks aangeroepen na early return op regel 43).

**"Cannot access refs during render" (React Compiler-linter):**
- `src/components/studio/Timeline.tsx` (meerdere regels 213, 533, 537, 538)
- `src/components/studio/Track.tsx` (regels 148, 152, 153)
- `src/components/studio/EditToolbar.tsx` (regels 142, 146, 147)
- `src/components/studio/SectionBar.tsx:199`

**"Calling setState synchronously within an effect" (React Compiler-linter):**
- `src/components/compositions/CompositionsView.tsx:47`
- `src/components/feedback/FeedbackModal.tsx:53`
- `src/components/start/StoryboardLightbox.tsx:32`
- `src/components/studio/EffectsModal.tsx:72`
- `src/components/studio/TrimModal.tsx:64`
- `src/hooks/useStageSave.ts:62`

**TDZ / use-before-declaration (ECHTE BUG):**
- `src/pages/LocationEditor.tsx:90` — gebruikt `loadExistingLocation` (gedefinieerd op regel 206). Admin-tool, maar bestaat wel in src/.

**Andere echte issues:**
- `src/contexts/AuthContext.tsx:102` — Fast-refresh-only-export violation.
- `src/components/share/ShareWithTeacherModal.tsx:77` — `'err' is defined but never used`.
- `src/components/teacher/TeacherRegister.tsx:17` — `'_onSuccess' is defined but never used`.
- `src/components/praatplaat/PraatplaatSelectScreen.tsx:131` — `Definition for rule 'jsx-a11y/no-autofocus' was not found` (gewoon: regel niet geïnstalleerd; comment naar regel verwijst niet bestaande config).

### M5c — Waarom de rules-of-hooks-violations echt zijn

`src/components/studio/storytelling/StorytellingPanel.tsx:41` doet:
```typescript
if (!activeStoryboard) return null;
```
Daarna op regel 50, 75, 99, 119, etc. worden hooks aangeroepen (`useCallback`, `useEffect`).

Dit werkt zolang `activeStoryboard` constant blijft tijdens de levensduur van de component. **Maar als `activeStoryboard` muteert van truthy naar null** terwijl de component nog gemount is (theme-switch, compositie laden zonder storyboard, praatplaat clearen), gooit React een runtime fatal:
> *"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."*

Dat is geen lint-cosmetica. Dat is **één state-mutatie verwijderd van een fatal crash**.

In de huidige codepaden kan ik niet *bewijzen* dat het crasht — alle paden die `setActiveStoryboard(null)` aanroepen ofwel doen dat tijdens screen-transitie (component unmount voordat het mutereert), ofwel renderen de panel-component niet. Maar het ontwerp is fragiel; één refactor verkeerd en het breekt.

### M5d — Implicatie voor B1 in het hoofdrapport

B1 zei: *"vrijwel allemaal duplicates uit `.claude/worktrees/competent-neumann-1ac6a2/**`"*. Dat klopt op *aantal* (de bulk komt inderdaad uit worktrees), maar de **kwalitatieve framing was misleidend**: het wekte de indruk dat er na worktree-exclusie geen substantiële errors zouden overblijven. Werkelijkheid: ~50 reële errors in src/, waarvan minimaal 16 rules-of-hooks-violations in productie-componenten op kritieke paden (storytelling + praatplaat).

**Klassikale blocker:** JA, gedeeltelijk. De rules-of-hooks-violations in StorytellingPanel zitten op het kritieke pad voor storyboard- en praatplaat-flows — precies de flows die je in workshops gaat showcasen.

**Herziene fix-inspanning voor B1 (was 0,5 uur, nu uitgebreid):**
- Lint-config schoonmaken + worktree uitsluiten: 0,5 uur.
- StorytellingPanel + StorytellingDisplay refactoren naar "alle hooks bovenaan, return null in JSX": 2-3 uur.
- LocationEditor TDZ fix: 0,25 uur.
- Setstate-in-effect warnings opruimen (deels false positives van React Compiler-linter, maar useStageSave + EffectsModal moeten echt naar useEffect-met-deps): 1-2 uur.
- Refs-during-render warnings (Timeline/Track/EditToolbar): 1-2 uur.
- **Totaal: 5-8 uur.**

**Status:** B1 in het hoofdrapport had de juiste blocker-classificatie maar onderschatte de scope. De rules-of-hooks-violations in StorytellingPanel zijn intrinsiek blocker-waardig en niet inbegrepen in de oorspronkelijke 0,5-uur-schatting.

---

## M6 — Design-token-omvang: AUDIT 1 TE LAAG GETELD, AUDIT 2 DRASTISCH ONDERSCHAT

**Status:** Het echte getal ligt tussen beide audits in, maar dichter bij audit 1's claim. Beide hadden een onnauwkeurig getal; audit 2's classificatie als "alleen StagePlayback (10×) belangrijk, rest nice-to-have" is helemaal onjuist.

**Bewijs (volledige grep, 22 mei 2026 herhaling):**

Rauwe kleurklassen (`text-/bg-/border-/ring-` gevolgd door red/green/blue/amber/yellow/teal/orange/pink/purple/indigo/cyan/emerald/lime/fuchsia/violet/rose + cijfer):
- **28 voorkomens in 3 bestanden**: `ComposeModeScreen.tsx`, `ComposeModeModal.tsx`, `StagePlayback.tsx`.

Grijstinten (`text-/bg-/border-/ring-` gevolgd door slate/gray/zinc/neutral/stone + cijfer):
- **295 voorkomens in 53 bestanden**.
- Uitsplitsing per prefix:
  - 145× `bg-neutral-*` — **verboden volgens CLAUDE.md** (moet `bg-bg-*` zijn)
  - 109× `text-neutral-*` — **verboden volgens CLAUDE.md** (moet `text-text-*` zijn)
  - 40× `border-neutral-*` — **LEGAAL** volgens CLAUDE.md ("Borders: `border-border-subtle`, `border-neutral-*`")
  - 1× `ring-neutral-*` — twijfelachtig (geen expliciete regel)

**Echte overtredingen volgens CLAUDE.md: 28 + 145 + 109 + 1 = 283 voorkomens in ~53 bestanden.**

**Vergelijking:**
- Audit 1 (hoofdrapport C3): 214 voorkomens. Te laag — mijn vorige grep had een striktere kleurenset (alleen specifieke kleuren) en miste de grijstinten. Het echte getal is ~33% hoger.
- Audit 2: alleen StagePlayback (10×) als C-niveau, rest nice-to-have. **Drastisch onderschat** — verschil van factor 28× op het totaal.

**Klassikale blocker:** NEE — design-tokens veranderen niets aan klassikale werking. Wel echte design-systeem-erosie waar elk nieuw Claude-sessie of nieuwe developer zich aan zal optrekken aan inconsistent voorbeeld.

**Top-10 overtreders (op basis van grep-counts uit hoofdrapport + herhaalde verificatie):**
1. `src/components/studio/Timeline.tsx` (27×)
2. `src/components/studio/EffectsModal.tsx` (23×)
3. `src/components/studio/TrimModal.tsx` (14×)
4. `src/components/studio/EditToolbar.tsx` (11×)
5. `src/components/StartScreen.tsx` (10×)
6. `src/components/studio/VolumePopover.tsx` (7×)
7. `src/components/share/SharedPlayer.tsx` (7×)
8. `src/components/share/SaveOnlineModal.tsx` (6×)
9. `src/components/share/ShareLinkModal.tsx` (6×)
10. `src/components/share/ShareWithTeacherModal.tsx` (5×)

Sweep van top-10 dekt ~116 van 283 overtredingen (~41%).

**Herziene fix-inspanning voor C3:**
- Top-10 sweep: 4-6 uur.
- Volledige sweep van alle 53 bestanden: 12-15 uur.
- **Aanbeveling:** doe top-10 voor promotie (visueel-meest-zichtbare componenten); rest in volgende sprint.

---

## Welke audit had het betere risicomodel?

Audit 2 (de tweede AI-audit) had **op klassikale risico-perceptie duidelijk de winst**. Vier van zes discrepanties (M1 RPC-timeout, M2 clipboard-fallback, M3 stille corrupte-comp-drop, M4a OffscreenCanvas) zijn klassieke schoolinfrastructuur-issues. Audit 1 (dit document, hoofdrapport hierboven) noemde geen van de vier. Dat is geen toeval; dat is een scope-blindheid.

### Waarom miste audit 1 deze punten?

**1. Scope-keuze (deels uitlegbaar).**
Het hoofdrapport dispatchte vier parallelle agents op categorieën uit de oorspronkelijke prompt: audio, state/Supabase, UI/UX, robuustheid. Geen daarvan kreeg expliciet de briefing *"denk vanuit klassikale netwerk-realiteit: 25 kinderen op één schoolwifi-AP, gemixt Chromebook/iPad, oude managed devices, scholennetwerken met proxies en captive portals"*. De robuustheid-agent kwam het dichtst in de buurt maar bleef op het abstracte niveau ("WebCodecs fallback") zonder concreet door schoolcontext te denken. Een specifieker briefing had RPC-timeouts en clipboard-fallback meteen opgeleverd.

**2. Diepte op specifieke bestanden (eerlijk: niet diep genoeg).**
Bij audit 1 las ik `submissions.ts`, `videoExportEngines.ts` en `StorageService.ts` slechts deels — alleen waar de agents naar wezen. Bij de meta-audit las ik ze volledig. De OffscreenCanvas-claim en RPC-timeout-claim zijn beide met één grondige sequentiële lezing duidelijk; geen ervan vereist diepe expertise. Ik had dit moeten vinden in audit 1.

**3. Een echte verificatiefout: C7.**
Audit 1's C7 ("detectBestEngine na zware audio-prep") schreef ik op zonder `videoExport.ts` zelf te lezen. Een agent had het gezegd en ik nam het over. Toen ik het bij de meta-audit verifieerde bleek het tegendeel waar. Dat is *pijnlijk* omdat ik in audit 1 schreef dat ik claims had geverifieerd — en op dit punt deed ik dat niet. C7 wordt hierbij ingetrokken.

**4. Lint-status onderschat: B1-framing.**
Audit 1 framed de 103 lint-errors als "vrijwel allemaal worktree-ruis". Bij `grep -v worktree` op de eerste lint-output blijken er ~50 reële errors in `src/` te zitten, waaronder rules-of-hooks-violations die runtime-crashes kunnen veroorzaken in storyboard- en praatplaat-flows. Ik nam de oppervlakkige conclusie. Een tweede grep had het meteen opgehelderd.

**5. Design-token-telling te laag.**
Audit 1's C3 zei 214 in 53 bestanden; werkelijk is het 283 in 53 bestanden. De grep-regex was strikter dan optimaal. Niet ernstig, maar niet nauwkeurig.

### Wat audit 2 vermoedelijk miste (zonder audit 2's volledige tekst te zien)

- Tone.js-specifieke valkuilen: audioVersion-convention (`setLooping`/`loadTimeline`), on-demand player disposal, loop-seek edge cases, fade-curve slicing. Dat is mijn vakgebied geweest in audit 1 en daar zat ik dichter op.
- Supabase-RLS-architectuur: wat goed staat (rate-limiting, SECURITY DEFINER met `auth.uid()`, lazy-load), en wat oppervlakkig misleidend lijkt maar wel klopt (rate_limits zonder policies is PostgreSQL-default deny).
- Undo/redo + loadTimeline interactie (force-stop vóór reload — voorkomt erger).
- PERF-1 audio-architectuur (on-demand fire-and-forget players) en de subtiele convention dat alle clip-mutaties `audioVersion` ophogen.

Beide audits hadden dus blinde vlekken; ze waren grotendeels complementair. Maar voor jouw specifieke context — *promotie naar docenten, klassikale workshops, schoolinfrastructuur* — heeft audit 2 de zwaardere bevindingen aangedragen.

### Consequenties voor de definitieve actielijst

**Updated blocker-lijst (vervangt B1 in hoofdrapport):**

| # | Item | Bron | Inspanning |
|---|------|------|------------|
| B1' | Lint-config + rules-of-hooks-violations in StorytellingPanel/StorytellingDisplay + LocationEditor TDZ + refs-during-render | M5 (uitgebreid van hoofdrapport B1) | 5-8 uur |

**Updated belangrijk-lijst (toegevoegd aan C1-C7 uit hoofdrapport, minus de ingetrokken C7):**

| # | Item | Bron | Inspanning |
|---|------|------|------------|
| C1 | `setLooping`/`loadTimeline` audioVersion | Hoofdrapport | 0,25 uur |
| C2 | LocationEditor use-before-declaration | Hoofdrapport (overlapt M5) | 0,25 uur |
| C3 | Design-tokens — top-10 sweep | Hoofdrapport (getal bijgesteld naar 283) | 4-6 uur |
| C4 | Video-export op iPad: timeout + WebM-UA-check | Hoofdrapport | 2-3 uur |
| C5 | Testdekking hooks/services/components | Hoofdrapport | 8-12 uur (post-promotie) |
| C6 | Praatplaat-positie NULL-guard | Hoofdrapport | 0,75 uur |
| C7 | ~~detectBestEngine timing~~ | **INGETROKKEN — M4b** | — |
| **M1** | **RPC-timeout helper + afbreekknop** | **Meta-audit** | **2-3 uur** |
| **M3** | **Stille corrupte-composities-drop banner** | **Meta-audit** | **1,5 uur** |

**Updated nice-to-have:**

Alle D1-D11 uit hoofdrapport blijven geldig, plus:

| # | Item | Bron | Inspanning |
|---|------|------|------------|
| **M2** | **Clipboard-fallback unificeren** | **Meta-audit** | **0,5 uur** |
| **M4a** | **OffscreenCanvas feature-check** | **Meta-audit** | **0,25 uur** |

**Totaal extra werk uit meta-audit voor pre-promotie:** ~4-5 uur (M1 + M3 + M2 + M4a + uitbreiding van B1 met +5 uur).

**Aanbeveling:** Pak vóór promotie minstens de volgende sequentie aan, in deze volgorde:
1. **B1'** (lint + rules-of-hooks-fixes in StorytellingPanel/Display) — voorkomt potentiële runtime crashes in showcase-flows.
2. **M1** (RPC-timeout + afbreekknop) — voorkomt de meest pijnlijke klassikale UX-failure.
3. **C1** (audioVersion) — 15 minuten werk, eenvoudige defense-in-depth.
4. **C6** (praatplaat NULL-guard) — voorkomt latent onzichtbare submissions.
5. **M3** (corrupte-comp banner) — goedkope verzekering tegen schema-toekomst.

Dat is ~10-15 uur werk en dekt het echte risicoprofiel voor klassikale promotie.

### Eerlijke zelfbeoordeling

Audit 1 (hoofdrapport hierboven) was *technisch sterk op audio en state-management* en miste *systematisch de schoolinfrastructuur-context*. De agent-dispatch-strategie produceerde brede dekking maar geen scherpe inschatting van klassikale failure-modi. Drie bevindingen waren bovendien niet voldoende geverifieerd:
- C7 was onjuist (ingetrokken).
- B1 was qua framing misleidend (uitgebreid in M5).
- C3 telde te laag (gecorrigeerd in M6).

Voor toekomstige Claude-audits: brief expliciet de *gebruikscontext* (klaslokaal, schoolwifi, mixed devices, oude iPads, managed Chromebooks) en lees zelf elk bestand waarop een agent een specifieke regel-claim doet. Vertrouw niet op het samenvattend werk van sub-agents voor file:line-claims; verifieer ze door direct lezen.

---

## Methodologie meta-audit

**Geverifieerd door directe file-reads in deze sessie:**
- `src/lib/submissions.ts` (volledig, 415 regels)
- `src/lib/auth.ts` (grep op rpc-patterns)
- `src/utils/schemas.ts` (volledig, 204 regels)
- `src/services/StorageService.ts` (volledig, 444 regels)
- `src/utils/videoExportEngines.ts` (volledig, 356 regels)
- `src/utils/videoExport.ts` (volledig, 179 regels)
- `src/components/share/ShareCodeInput.tsx` (relevante delen, regels 30-165)
- `src/components/stage/SaveAsTemplateModal.tsx:55-95`
- `src/components/teacher/TemplateCard.tsx:22-50`
- `src/components/editor/JsonExportPanel.tsx:20-45`
- `src/components/share/ShareLinkModal.tsx:80-105`
- `src/components/studio/storytelling/StorytellingPanel.tsx:30-90`

**Build/test/lint-status (22-05-2026, herhaalde run):**
- `npx tsc -b --noEmit` → exit 0
- `npm run test:run` → 227/227 pass
- `npm run lint` → 116 problems (103 errors, 13 warnings); na worktree-uitsluiting ~50 errors in `src/` waarvan 16+ rules-of-hooks-violations

**Volledige greps:**
- Rauwe kleuren: 28 in 3 bestanden
- Grijstinten: 295 in 53 bestanden (waarvan 40 legale border-neutrals)
- Echte design-token-overtredingen: 283 in ~53 bestanden
- AbortController/timeout/Promise.race in `src/lib/`: 0 matches
