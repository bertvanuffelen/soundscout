# Datamodel: wat een compleet thema omvat

Een thema = **4 TS-bestanden** + **registratie** + **i18n-keys** + **2 asset-mappen**.
Praatplaten en storyboards zijn losse registries die via `themeId` koppelen.

> Deze specificatie standaardiseert bewust op de nieuwste conventies (winterspelen-stijl
> i18n, mechanisch afleidbare audio-paden). Oudere thema's wijken af — niet kopiëren.

## Bestanden

```
src/data/themes/{themeId}/
  index.ts       → ThemeConfig (id, name, description, isPublic, locations, samples, map, colors?)
  locations.ts   → Location[]
  samples.ts     → Sample[]
  map.ts         → MapConfig
src/data/themes/index.ts          → thema toevoegen aan het `themes`-record
src/data/praatplaatImages.ts      → entry per praatplaat (id-prefix `pp-`)
src/data/storyboards.ts           → entry per storyboard
src/i18n/locales/nl.json + en.json → keys (beide talen verplicht, identieke keysets)
public/images/themes/{themeId}/   → plattegrond.jpg + {locationId}.jpg
public/images/praatplaten/        → {naam}.jpg
public/images/storyboards/{sbId}/ → {sbId}-1.jpg … {sbId}-N.jpg
public/audio/themes/{themeId}/{locationId}/{sampleId}.mp3
```

## Veldspecificaties (bron: `src/data/themes/types.ts` + `src/types/index.ts`)

**ThemeConfig** (`index.ts`): `id` · `name`/`description` (i18n-keys
`themes.{id}.name`/`.description`) · `isPublic` (false = alleen via `?theme=`) ·
`locations` · `samples` · `map` · optioneel `colors: { primary, accent, mapBackground }`
(hex; voorbeeld winterspelen: `#3B82F6` / `#60A5FA` / `#E0F2FE`).

**Location**: `id` · `name: 'themes.{themeId}.locations.{locationId}'` ·
`description: 'themes.{themeId}.locations.{locationId}_desc'` ·
`backgroundImage: '/images/themes/{themeId}/{locationId}.jpg'` · `ambientAudio: ''` ·
`unlocked: true` · `hotspots: Hotspot[]`.

**Hotspot**: `id` (= sampleId) · `x`/`y` (0-100, %) · `sampleId` ·
`visualHint: 'pulse'`. Het veld `radius` is deprecated (universeel
`DEFAULT_HOTSPOT_RADIUS = 4`) — **weglaten** in nieuwe data. Hotspot-plaatsing gebeurt
in `/editor`; het pakket levert alleen x/y-startadvies in INTEGRATIE.md.

**Sample**: `id: '{locationId}-{naam}'` · `locationId` ·
`name: 'themes.{themeId}.samples.{sampleId}'` ·
`audioUrl: '/audio/themes/{themeId}/{locationId}/{sampleId}.mp3'` (**bestandsnaam =
sampleId, altijd mechanisch afleidbaar**) · `duration` (seconden, gemeten met
`check-audio.py`, nooit geschat) · `icon` (Lucide-naam, bv. `'Dog'`, `'Zap'`,
`'Megaphone'`) · `color` (hex; gebruik het 400-tint-palet zoals bestaande thema's:
`#FBBF24` amber, `#F472B6` pink, `#F87171` red, `#FB923C` orange, `#60A5FA` blue,
`#34D399` emerald, `#A78BFA` violet, `#38BDF8` sky — varieer binnen een locatie).

**MapConfig**: `backgroundImage: '/images/themes/{themeId}/plattegrond.jpg'` ·
`locationPositions: [{ locationId, x, y, size? }]` (x/y 0-100; `size` `'sm'|'md'|'lg'`,
default md).

**PraatplaatImage** (`praatplaatImages.ts`): `id: 'pp-{naam}'` ·
`nameKey: 'praatplaatImages.{naam}'` · `imageUrl: '/images/praatplaten/{naam}.jpg'` ·
`category: 'natuur'|'stad'|'gebouw'|'feest'|'fictie'|'overig'` ·
`availableFor: 'teacher'|'student'|'both'` · `themeId` (verplicht bij student/both —
koppelt de geluiden).

**Storyboard** (`storyboards.ts`): `id` · `themeId` ·
`name: 'storyboards.{id}.name'` · `description: 'storyboards.{id}.description'` ·
`coverImage` (kies het sterkste frame) · `images: [{ id, url, label:
'storyboards.{id}.{frameId}' }]`. 2+ frames = slideshow met auto-secties op de timeline.

## i18n (geneste conventie — verplicht voor nieuwe thema's)

```json
{
  "themes": {
    "{themeId}": {
      "name": "…", "description": "…",
      "locations": { "{locationId}": "…", "{locationId}_desc": "…" },
      "samples": { "{sampleId}": "…" }
    }
  },
  "storyboards": { "{sbId}": { "name": "…", "description": "…", "{frameId}": "…" } },
  "praatplaatImages": { "{naam}": "…" }
}
```

Beide talen (nl.json én en.json), identieke keysets. Sample-namen kort en kindvriendelijk
("Touwtje springen", "Stoeltjeslift").

## Asset-specificaties

- **Alle beelden: 1920×1072 JPG** (~0,5-1,1 MB). Let op: `docs/NIEUWE-LOCATIE-THEMA.md`
  zegt ten onrechte 1920×1080/png — de echte assets zijn 1072/jpg. `verwerk-afbeelding.py`
  dwingt dit af.
- **Audio: mp3**, sfx 2-8 s (~50-200 KB), muziekloops **exact 8.0 s** (= 4 maten @
  120 BPM, het vaste tempo van de app).
- 6-8 samples per locatie; 4-5 locaties per thema (richtlijn).

## Registratie-stappen (voor INTEGRATIE.md)

1. Assets uit `package/public/…` naar `public/…` kopiëren.
2. `src/data/themes/{themeId}/` uit het pakket kopiëren.
3. In `src/data/themes/index.ts`: import + toevoegen aan het `themes`-record.
4. i18n-fragmenten mergen in `nl.json`/`en.json`.
5. Praatplaat-entries toevoegen aan `praatplaatImages.ts`; storyboard-entry aan
   `storyboards.ts`.
6. `BRONNEN.md` meekopiëren naar `src/data/themes/{themeId}/`.
7. `npm run build` (tsc-gate) → hotspots plaatsen in `/editor` → testen via `?theme={themeId}`.
