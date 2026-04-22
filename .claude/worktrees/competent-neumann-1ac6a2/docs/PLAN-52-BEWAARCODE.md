# Plan #52 — Online Bewaarcode (Compositie Overdracht)

**Status:** ✅ Volledig afgerond (Fase 1: 2026-03-19, Fase 2: 2026-03-25)
**Datum:** 2026-03-19 (initieel), 2026-03-25 (fase 2)
**Geschatte effort:** 4-6 uur

---

## Samenvatting

Leerlingen kunnen hun compositie online bewaren en krijgen een 6-cijferige bewaarcode. Op een ander apparaat voeren ze de code in en laden de compositie in de studio om verder te werken. Composities vervallen na 60 dagen inactiviteit. Optioneel: koppeling aan klascode zodat de docent bewaar-composities kan zien.

---

## Hergebruik van bestaande infrastructuur

| Bestaand | Hergebruik voor #52 |
|----------|---------------------|
| `submissions` tabel (Supabase) | Nieuwe kolommen voor bewaarcode-functionaliteit |
| `generate_share_code()` SQL functie | Aanpassen naar 6-cijferig formaat |
| `get_shared_composition()` RPC | Uitbreiden met update-support |
| `ShareCodeInput` component | Uitbreiden: bewaarcode → laad in studio (niet read-only) |
| `ShareLinkModal` component | Patroon hergebruiken voor bewaar-modal |
| `check_rate_limit()` SQL functie | Hergebruiken voor bewaar-acties |
| `CompositionData` type | Ongewijzigd — zelfde datastructuur |

---

## Database-wijzigingen

### Nieuwe kolommen op `submissions` tabel

```sql
-- Migratie: 004_save_codes.sql
ALTER TABLE public.submissions
  ADD COLUMN save_code VARCHAR(6) UNIQUE,       -- 6-cijferige bewaarcode
  ADD COLUMN save_secret VARCHAR(32),            -- Bewerk-geheim (voorkomt ongeautoriseerde updates)
  ADD COLUMN last_updated_at TIMESTAMPTZ,        -- Voor 60-dagen vervaltermijn
  ADD COLUMN student_email TEXT,                 -- Optioneel e-mailadres
  ADD COLUMN is_save BOOLEAN DEFAULT FALSE;      -- Onderscheid: bewaarcode vs share-link
```

**Waarom `save_code` apart van `share_code`?**
- Verschillende lengtes (6 vs 8 karakters) → gebruiker weet direct welk type code het is
- Verschillende doelen: bewaarcode = lezen + schrijven, share-code = alleen lezen
- Een compositie kan BEIDE hebben (bewaard + gedeeld)

**Waarom `save_secret`?**
- De bewaarcode is kort (6 cijfers) en publiek kenbaar → iemand anders zou de compositie kunnen overschrijven
- Bij opslaan krijgt de leerling een `save_secret` (32-char token, opgeslagen in localStorage)
- Bij bijwerken moet de secret meegegeven worden — zonder secret geen schrijftoegang
- Als de leerling op een nieuw apparaat werkt: code invoeren → laden (lezen), maar bijwerken vereist de secret. Het systeem genereert dan een nieuwe secret en de leerling "claimt" de compositie opnieuw

### Nieuwe RPC functies

**`save_composition_online(p_student_name, p_composition_name, p_composition_data, p_class_code?, p_email?)`**
- Genereert 6-cijferige bewaarcode + 32-char secret
- Slaat compositie op met `is_save = true`, `last_updated_at = NOW()`
- Als `p_class_code` opgegeven: koppelt aan klas (`class_id`)
- Rate limit: 10/min per sessie
- Returns: `{ save_code, save_secret }`

**`update_saved_composition(p_save_code, p_save_secret, p_composition_data, p_composition_name?)`**
- Valideert secret → update `composition_data` + `last_updated_at`
- Zonder geldige secret → error
- Rate limit: 30/min per code
- Returns: `{ success: true }`

**`load_saved_composition(p_save_code)`**
- Laadt compositie (read-only, geen secret nodig)
- Checkt `last_updated_at` + 60 dagen → als verlopen, return null
- Returns: `{ composition_name, student_name, composition_data, last_updated_at }`

**`claim_saved_composition(p_save_code, p_student_name)`**
- Voor nieuw apparaat: leerling voert code in, geeft naam op
- Genereert nieuwe `save_secret`, slaat op
- Rate limit: 5/min per code (voorkom brute force)
- Returns: `{ save_secret }`

### Opschoning: verlopen composities

```sql
-- Cron of periodieke functie
DELETE FROM public.submissions
WHERE is_save = TRUE
  AND last_updated_at < NOW() - INTERVAL '60 days';
```

Dit kan als Supabase cron job (pg_cron extensie) of als handmatige periodieke taak.

---

## Code-formaat

| Type | Formaat | Voorbeeld | Doel |
|------|---------|-----------|------|
| Klascode | 4 cijfers | `2847` | Klas identificatie |
| Bewaarcode | 6 alfanumeriek | `K7M2P9` | Compositie bewaren + laden |
| Deelcode | 8 alfanumeriek | `AB3KM7PQ` | Publiek luisteren |
| Template-code | 8 alfanumeriek | `XY4NR8ST` | Opdracht laden |

`ShareCodeInput` herkent het type op basis van lengte en inhoud:
- 4 karakters, alleen cijfers → klascode (bestaand)
- 6 karakters → bewaarcode (nieuw)
- 8 karakters → deelcode of template (bestaand)

---

## Flow: Bewaren

```
Podium-scherm → "Bewaar online" knop
         ↓
SaveOnlineModal opent
  ├─ Naam: [verplicht tekstveld]
  ├─ E-mail: [optioneel tekstveld]
  ├─ Klascode: [optioneel 4-cijferig veld] ← koppelt aan docent
  └─ [Bewaar] knop
         ↓
RPC: save_composition_online(...)
         ↓
Succes-scherm toont:
  ├─ "Jouw bewaarcode: K7M2P9"
  ├─ "Onthoud deze code goed!"
  ├─ [Kopieer code] knop
  ├─ [Stuur naar mijn mail] knop (als e-mail ingevuld)
  └─ save_secret wordt opgeslagen in localStorage
```

## Flow: Verder werken (zelfde apparaat)

```
Leerling opent app → localStorage heeft save_secret
         ↓
Bij "Ga verder" of "Mijn composities":
  compositie laadt lokaal (bestaand gedrag)
         ↓
Bij opslaan: update_saved_composition() met save_secret
  → last_updated_at wordt vernieuwd (60-dagen timer reset)
```

## Flow: Verder werken (ander apparaat)

```
Startscherm → code invoer veld → "K7M2P9"
         ↓
ShareCodeInput detecteert 6-karakter code
         ↓
RPC: load_saved_composition(code)
         ↓
Compositie geladen → navigeer naar studio (NIET read-only speler)
  ├─ Tracks, clips, secties worden geladen in timelineStore
  ├─ Samples worden geladen uit thema-assets
  └─ Leerling kan direct verder werken
         ↓
Bij eerste opslaan op nieuw apparaat:
  ├─ Claim-flow: naam bevestigen → nieuwe save_secret
  └─ Daarna: normaal bijwerken met nieuwe secret
```

## Flow: Docent ziet bewaar-composities

```
Docent Dashboard → klas → tab "Werk in uitvoering"
         ↓
Toont alle composities met is_save=true én class_id = deze klas
  ├─ Leerlingnaam
  ├─ Compositienaam
  ├─ Laatst bewerkt
  └─ Bewaarcode (docent kan deze doorgeven bij kwijtraken)
```

---

## "Stuur naar mijn mail"

Hergebruikt het bestaande EmailJS-systeem (al geconfigureerd voor feedback). Stuurt een simpele mail met:
- Onderwerp: "SoundScout — Jouw bewaarcode"
- Inhoud: de 6-cijferige code + korte instructie
- Geen compositie-data in de mail (alleen de code)

---

## Implementatiestappen

### Stap 1: Database migratie (004_save_codes.sql)
- Nieuwe kolommen op `submissions` tabel
- Nieuwe RPC functies: `save_composition_online`, `update_saved_composition`, `load_saved_composition`, `claim_saved_composition`
- Code-generator voor 6-karakter codes
- Rate limiting
- RLS policies

### Stap 2: Client-side lib functies
- `src/lib/submissions.ts` uitbreiden met:
  - `saveCompositionOnline(params)` → returns `{ saveCode, saveSecret }`
  - `updateSavedComposition(code, secret, data)` → returns success
  - `loadSavedComposition(code)` → returns compositie
  - `claimSavedComposition(code, name)` → returns nieuwe secret

### Stap 3: SaveOnlineModal component
- Naam (verplicht), e-mail (optioneel), klascode (optioneel)
- Succes-scherm met code + kopieer-knop
- Mail-verstuur knop (EmailJS)

### Stap 4: ShareCodeInput uitbreiden
- 6-karakter codes herkennen als bewaarcode
- Bij bewaarcode: compositie laden in studio (niet in SharedPlayer)
- Nieuwe functie `initializeFromSavedComposition()` in `compositionInit.ts`

### Stap 5: Auto-update bij opslaan
- `useStageSave` hook uitbreiden: als compositie een `saveCode` + `saveSecret` heeft, automatisch `update_saved_composition()` aanroepen bij opslaan
- `last_updated_at` wordt vernieuwd → 60-dagen timer reset
- `SavedComposition` type uitbreiden met `saveCode?` + `saveSecret?`

### Stap 6: Docenten dashboard uitbreiding
- Nieuwe tab/sectie "Werk in uitvoering" in klasdetail
- Toont bewaar-composities gekoppeld aan de klas
- Bewaarcode zichtbaar voor docent

### Stap 7: i18n
- NL + EN vertalingen voor alle nieuwe UI-teksten

### Stap 8: Tests + verificatie
- RPC functies testen (save, update, load, claim, expiry)
- UI flow testen (bewaren, code invoeren, verder werken)
- Edge cases: verlopen codes, ongeldige secrets, rate limits

---

## Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Code-raden (6 chars = 2M combinaties) | Laag — alleen lezen, niet schrijven | Rate limit op load (30/min). Secret vereist voor schrijven |
| Secret kwijtraken + nieuw apparaat | Medium — leerling kan niet bijwerken | Claim-flow genereert nieuwe secret. Docent kan code opzoeken |
| Supabase free tier limieten | Laag — composities zijn 2-4 KB | 500 MB = 100.000+ composities |
| EmailJS limieten | Laag — 200 mails/maand free tier | Alleen optioneel, niet verplicht |
| Complexiteit claim-flow | Medium — extra stap voor leerling | Duidelijke UI instructies. Eerste keer opslaan = automatisch |

---

## Fasering voor publicatie

**Fase 1 — Afgerond (2026-03-19):**
- ✅ Stappen 1-5: database, lib, bewaar-modal, code-invoer, auto-update
- ✅ Stap 7: i18n

**Fase 2 — Afgerond (2026-03-25):**
- ✅ Auto-sync bij lokaal opslaan: `useStageSave` fire-and-forgets `updateSavedComposition()` wanneer `saveOnlineInfo` in localStorage staat
- ✅ QR-code weergave: toggle-knop in SaveOnlineModal success-scherm via `qrcode` npm package, toont scanbare QR van 6-char code
- ✅ Docenten dashboard: "In bewerking" tab in `ClassDetail` — splitst submissions op `save_code` aanwezigheid. WIP-kaarten tonen blauw badge + "Laatst bewerkt" datum

**Nog niet geïmplementeerd (nice-to-have):**
- Verlopen-herinnering per e-mail
