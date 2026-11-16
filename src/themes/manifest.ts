/**
 * Thema-manifest (V2 Fase 3 — themaplatform). Eén Zod-schema, gedeeld door de
 * app (loader), het conversiescript, later het beheerdashboard, en — via het
 * geëxporteerde JSON Schema `public/themes/manifest.schema.json` — de
 * thema-skills (`check-pakket.py`). Uitleg: docs/v2/THEMES.md.
 *
 * Een manifest is een vaste, onveranderlijke versie van een thema: dezelfde
 * vorm als de runtime-`ThemeConfig`, plus de teksten per taal en de paden van
 * de media RELATIEF aan `assetBase` (of aan de map van het manifest).
 *
 * Dit bestand is puur (geen browser-API's, geen app-imports): het draait ook in
 * Node (conversiescript) en in de tests.
 */

import { z } from 'zod';

export const MANIFEST_SCHEMA_VERSION = 1;

// --- Bouwstenen ---

/** Thema-, locatie-, sample- en hotspot-ids: kleine letters, cijfers, - en _. */
const Id = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, 'id: kleine letters, cijfers, - en _');

/** Taalcode ('nl', 'en', 'de', 'pt-BR', ...). */
export const LanguageCode = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'taalcode zoals nl, en of pt-BR');

/**
 * Pad naar een mediabestand. Relatief (`audio/x.mp3`) wordt opgelost tegen
 * `assetBase`; een absoluut pad (`/audio/x.mp3`) of volledige URL blijft zoals het is.
 */
const AssetPath = z.string().min(1).refine((p) => !p.includes('\\'), 'gebruik / in paden');

const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'kleur als #RRGGBB');

/** 'MM-DD', bijvoorbeeld '11-15'. */
const MonthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "datum als 'MM-DD'");

/** Positie als percentage van de afbeelding (0-100). */
const Percent = z.number().min(0).max(100);

// --- Locaties, hotspots, samples ---

export const HotspotSchema = z.object({
  id: Id,
  /** Percentage van de breedte (0-100). */
  x: Percent,
  /** Percentage van de hoogte (0-100). */
  y: Percent,
  /** Verouderd: de app gebruikt één vaste straal. Alleen bewaard voor oude thema's. */
  radius: z.number().positive().optional(),
  sampleId: Id,
  visualHint: z.enum(['glow', 'pulse', 'none']),
});

/**
 * Vaste i18n-sleutels. ALLEEN voor bestaande thema's waarvan de sleutels al in
 * opgeslagen composities staan (`basis`); een nieuw thema laat dit weg en
 * krijgt de standaardsleutels (zie `themeTextKeys` in mapping.ts).
 */
const LocationTextKeys = z.object({ name: z.string().min(1), description: z.string().min(1) });

export const LocationSchema = z.object({
  id: Id,
  /** Achtergrondbeeld van de locatie (16:9). */
  image: AssetPath,
  /** Optioneel sfeergeluid. */
  ambient: AssetPath.optional(),
  /** Standaard true. */
  unlocked: z.boolean().optional(),
  hotspots: z.array(HotspotSchema),
  textKeys: LocationTextKeys.optional(),
});

export const SampleSchema = z.object({
  id: Id,
  locationId: Id,
  file: AssetPath,
  /** Duur in seconden. */
  duration: z.number().positive(),
  /** Lucide-icoonnaam ('Bird', 'Dog', ...). */
  icon: z.string().min(1),
  color: HexColor,
  /**
   * 'sfx' = geluidseffect (2-8 s), 'loop' = muziekloop (exact 8.0 s @ 120 BPM).
   * Weggelaten bij bestaande thema's waar het type nooit is vastgelegd.
   */
  kind: z.enum(['sfx', 'loop']).optional(),
  /** Vaste i18n-sleutel (alleen bestaande thema's, zie LocationSchema.textKeys). */
  textKey: z.string().min(1).optional(),
});

export const MapPositionSchema = z.object({
  locationId: Id,
  x: Percent,
  y: Percent,
  size: z.enum(['sm', 'md', 'lg']).optional(),
  /** Optioneel eigen markericoon. */
  icon: AssetPath.optional(),
});

/** Plattegrond: één beeld per taal (de kaart heeft plaatsnamen); `nl` verplicht. */
export const MapSchema = z.object({
  image: z.object({ nl: AssetPath }).catchall(AssetPath),
  positions: z.array(MapPositionSchema),
});

export const ColorsSchema = z.object({
  primary: HexColor.optional(),
  accent: HexColor.optional(),
  mapBackground: HexColor.optional(),
});

/** Seizoensvenster 'MM-DD' t/m 'MM-DD' (jaargrens mag: '11-15' t/m '01-15'). */
export const SeasonSchema = z.object({ from: MonthDay, until: MonthDay });

// --- Teksten per taal ---

const LocationTexts = z.object({ name: z.string().min(1), description: z.string().optional() });

/** Teksten in één taal. Voor `nl` is alles verplicht, andere talen mogen gaten hebben (val terug op nl). */
export const LanguageTextsSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  locations: z.record(z.string(), LocationTexts),
  samples: z.record(z.string(), z.string().min(1)),
});

export const PartialLanguageTextsSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  locations: z.record(z.string(), LocationTexts.partial()).optional(),
  samples: z.record(z.string(), z.string().min(1)).optional(),
});

/** `texts.nl` verplicht; elke andere taalcode mag erbij zonder codewijziging. */
export const TextsSchema = z
  .object({ nl: LanguageTextsSchema })
  .catchall(PartialLanguageTextsSchema)
  .refine((texts) => Object.keys(texts).every((lang) => LanguageCode.safeParse(lang).success), {
    message: 'elke sleutel in texts is een taalcode',
  });

// --- Het manifest ---

export const ThemeManifestSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  id: Id,
  /** Oplopend versienummer; een gepubliceerde versie verandert nooit meer. */
  version: z.number().int().positive(),
  /** draft = nog niet zichtbaar voor de app; published = laadbaar. */
  status: z.enum(['draft', 'published']),
  /** In kiezers (true) of alleen via link/opdracht/bewaarcode (false). */
  isPublic: z.boolean(),
  /** Optioneel seizoensvenster; buiten het venster verdwijnt het thema uit leerling-kiezers. */
  season: SeasonSchema.optional(),
  /** Volgorde in kiezers (laag eerst). */
  sort: z.number().int().optional(),
  /**
   * Basis voor relatieve mediapaden: absoluut pad ('/') of URL. Weggelaten =
   * de map waarin het manifest staat (zo werkt een .sspack of een Storage-versie).
   */
  assetBase: z.string().min(1).optional(),
  colors: ColorsSchema.optional(),
  map: MapSchema,
  locations: z.array(LocationSchema).min(1),
  samples: z.array(SampleSchema),
  texts: TextsSchema,
});

export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;
export type ManifestLocation = z.infer<typeof LocationSchema>;
export type ManifestSample = z.infer<typeof SampleSchema>;
export type ManifestHotspot = z.infer<typeof HotspotSchema>;
export type LanguageTexts = z.infer<typeof LanguageTextsSchema>;
export type PartialLanguageTexts = z.infer<typeof PartialLanguageTextsSchema>;

// --- Thema-index (public/themes/index.json) ---

/**
 * Eén regel per gepubliceerd thema: alles wat kiezers, opdrachten en de
 * praatplaat-catalogus nodig hebben ZONDER het volledige manifest te laden.
 * Wordt door het script uit de manifesten afgeleid, nooit met de hand bewerkt.
 */
export const ThemeIndexEntrySchema = z.object({
  id: Id,
  version: z.number().int().positive(),
  /** Pad van het manifest, relatief aan index.json. */
  manifest: z.string().min(1),
  isPublic: z.boolean(),
  season: SeasonSchema.optional(),
  sort: z.number().int().optional(),
  assetBase: z.string().min(1).optional(),
  colors: ColorsSchema.optional(),
  map: z.object({ image: MapSchema.shape.image }),
  locationCount: z.number().int().nonnegative(),
  sampleCount: z.number().int().nonnegative(),
  locations: z.array(LocationSchema.pick({ id: true, image: true, textKeys: true })),
  /** Thema- en locatieteksten per taal (sampleteksten staan alleen in het manifest). */
  texts: z
    .object({ nl: LanguageTextsSchema.omit({ samples: true }) })
    .catchall(PartialLanguageTextsSchema.omit({ samples: true })),
});

export const ThemeIndexSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  themes: z.array(ThemeIndexEntrySchema),
});

export type ThemeIndexEntry = z.infer<typeof ThemeIndexEntrySchema>;
export type ThemeIndex = z.infer<typeof ThemeIndexSchema>;

/** JSON Schema (draft 2020-12) van het manifest, voor tooling buiten de app. */
export function manifestJsonSchema(): Record<string, unknown> {
  return {
    $id: 'https://soundscout.nl/themes/manifest.schema.json',
    title: 'SoundScout theme manifest',
    ...z.toJSONSchema(ThemeManifestSchema, { target: 'draft-2020-12', io: 'input' }),
  } as Record<string, unknown>;
}
