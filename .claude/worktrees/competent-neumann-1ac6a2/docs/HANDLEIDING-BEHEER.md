# SoundScout — Beheerhandleiding

Technisch referentiedocument voor de maker/beheerder van SoundScout.

**Laatst bijgewerkt**: 2026-04-15

---

## 1. Deployment

### Productie-build maken en uploaden

```bash
npm run build        # TypeScript check + Vite productie build
```

Upload de inhoud van `dist/` naar je Strato-server (FTP). Niet de map zelf, maar alles erin. De `.htaccess` hoeft maar eenmaal geupload (tenzij gewijzigd). Zie `docs/DEPLOY-INSTRUCTIES.md` voor details.

### Controle na deployment

1. Open de site in Chrome → F12 → Console: geen rode CSP-fouten
2. Test de kernflow: Start → Kaart → Locatie → Studio → Podium
3. Test klascode-invoer (als Supabase actief is)
4. Check of audio afspeelt (autoplay unlock werkt)

---

## 2. Environment variabelen

| Variabele | Doel | Waar te vinden |
|-----------|------|----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonieme sleutel | Supabase dashboard → Settings → API |
| `VITE_EMAILJS_SERVICE_ID` | Feedback systeem | EmailJS dashboard |
| `VITE_EMAILJS_TEMPLATE_ID` | Feedback template | EmailJS dashboard |
| `VITE_EMAILJS_PUBLIC_KEY` | EmailJS publieke sleutel | EmailJS dashboard |
| `VITE_APP_URL` | Open Graph meta tags | Optioneel |

Bestanden: `.env.local` (lokaal) of `.env.production` (build). Nooit committen. Template: `.env.example`.

---

## 3. Supabase beheer

### Dashboard

Login: [https://supabase.com/dashboard](https://supabase.com/dashboard)

### Belangrijke tabellen

| Tabel | Inhoud |
|-------|--------|
| `classes` | Klassen van docenten (code, naam, is_active) |
| `submissions` | Leerling-inzendingen (compositie-data, bewaarcode, praatplaat-positie) |
| `templates` | Docent-templates (compositie-data, lock-opties) |
| `praatplaten` | Praatplaat-kaarten (naam, afbeelding, share_code, view_count) |
| `class_assignments` | Actieve opdrachten per klas (template of praatplaat) |
| `shared_compositions` | Gedeelde composities via deellink (30 dagen geldig) |
| `rate_limits` | Rate limiting tellers (automatisch opgeschoond) |

### Migraties

SQL-bestanden in `supabase/migrations/`, genummerd 002 t/m 012. Bij database-wijzigingen: nieuw bestand met volgend nummer. Altijd RLS policies toevoegen bij nieuwe tabellen.

### Veelvoorkomende taken

**Docent-wachtwoord resetten:**
Supabase dashboard → Authentication → Users → zoek op e-mail → "Send password reset"

**Klas verwijderen (met cascade):**
Verwijder via het docenten-dashboard (cascade delete verwijdert submissions + assignments automatisch via `009_hard_delete_cascade.sql`).

**Verlopen bewaarcodes opschonen:**
Composities met `last_updated_at` ouder dan 60 dagen kunnen verwijderd worden. Query:
```sql
SELECT id, save_code, composition_name, last_updated_at
FROM submissions
WHERE save_code IS NOT NULL
  AND last_updated_at < NOW() - INTERVAL '60 days';
```
Handmatig verwijderen na controle:
```sql
DELETE FROM submissions
WHERE save_code IS NOT NULL
  AND last_updated_at < NOW() - INTERVAL '60 days';
```

**Verlopen praatplaat-deellinks opschonen:**
Luisterpagina-links voor praatplaten verlopen na 30 dagen. Docenten kunnen ze verlengen via het dashboard. Om verlopen links handmatig op te ruimen:
```sql
SELECT id, name, share_code, share_expires_at, share_view_count
FROM praatplaten
WHERE share_code IS NOT NULL
  AND share_expires_at < NOW();
```
Opschonen (verwijdert alleen de share-kolommen, niet de praatplaat zelf):
```sql
UPDATE praatplaten
SET share_code = NULL, share_expires_at = NULL, share_view_count = 0
WHERE share_code IS NOT NULL
  AND share_expires_at < NOW();
```

**Rate limits resetten (als iemand geblokkeerd is):**
```sql
DELETE FROM rate_limits WHERE key LIKE '%<klascode-of-sessie>%';
```

---

## 4. Thema's en locaties

### Bestaande thema's

Thema-bestanden in `src/data/themes/{themeId}/`. Elk thema heeft:
- `locations.ts` — locaties met hotspots
- `samples.ts` — geluidssamples per locatie
- `map.ts` — kaartconfiguratie
- `index.ts` — exports

### Audio-bestanden

Locatie: `/public/audio/themes/{themeId}/{locationId}/{sampleId}.mp3`
Afbeeldingen: `/public/images/themes/{themeId}/`

### Nieuw thema/locatie toevoegen

Zie `docs/NIEUWE-LOCATIE-THEMA.md` voor de stap-voor-stap handleiding.

### Locatie Editor

Beschikbaar op `/editor` (beveiligd pad). Gebruik voor:
- Hotspot-posities aanpassen (drag-and-drop)
- Audio per hotspot uploaden
- Configuratie exporteren als JSON (opgeslagen in `docs/editor-exports/`)

---

## 5. Dagelijks onderhoud

### Wat automatisch gaat

- Audio autoplay unlock bij eerste gebruikersinteractie
- Rate limiting op Supabase RPC's (automatische reset per tijdvenster)
- localStorage cleanup: max 10 composities per browser

### Wat je periodiek moet checken

| Wat | Hoe vaak | Actie |
|-----|----------|-------|
| Supabase usage | Maandelijks | Dashboard → Usage: check storage, bandwidth, row counts |
| Verlopen bewaarcodes | Maandelijks | Zie query hierboven, handmatig opschonen |
| Verlopen praatplaat-links | Maandelijks | Zie query hierboven, share-kolommen resetten |
| EmailJS quota | Maandelijks | EmailJS dashboard → check resterende berichten |
| SSL-certificaat | Automatisch bij Strato | Controleer op waarschuwingsmails van Strato |

### Monitoring

Geen externe monitoring ingesteld. Belangrijkste signalen:
- Gebruikers melden problemen via het feedback-formulier (EmailJS → je inbox)
- Supabase dashboard → Logs voor database-fouten
- Browser console op productie voor JavaScript-fouten

---

## 6. Commando's referentie

```bash
# Development
npm run dev              # Lokale dev server (HMR)
npm run build            # Productie build
npm run preview          # Preview productie build lokaal

# Code kwaliteit
npm run lint             # ESLint check
npx tsc -b --noEmit      # TypeScript check (zonder build)

# Tests
npm test                 # Vitest watch mode
npm run test:run         # Enkele testrun (CI)
npm run test:coverage    # Met coverage rapport

# Enkel testbestand
npx vitest run src/utils/__tests__/audio.test.ts
```

---

## 7. Documentatie-index

| Bestand | Inhoud |
|---------|--------|
| `CLAUDE.md` | Architectuur, conventies, Tone.js pitfalls |
| `docs/TODO.md` | Alle open en afgeronde issues |
| `docs/TESTEN.md` | Handmatige testchecklist |
| `docs/DEPLOY-INSTRUCTIES.md` | Strato deployment stappen |
| `docs/NIEUWE-LOCATIE-THEMA.md` | Handleiding nieuwe thema's/locaties |
| `docs/TONEJS-KENNISBANK.md` | Tone.js kennisbank en beperkingen |
| `docs/PLAN-*.md` | Feature-plannen per issue |
| `docs/ROADMAP-*.md` | Technische roadmaps |
| `soundscout-prd.md` | Product requirements document |

---

## 8. Noodprocedures

### Site is offline

1. Check Strato status pagina
2. Controleer of `dist/` correct is geupload (index.html in root)
3. Controleer `.htaccess` (mod_rewrite moet aan staan)

### Supabase is down

De app werkt grotendeels zonder Supabase. Alleen deze features stoppen:
- Klascode invoeren (docent + leerling)
- Composities delen met docent
- Online bewaarcodes
- Praatplaat (alles)
- Docenten-dashboard (login + data)

Lokaal opslaan, MP3 export, en de volledige studio-flow werken gewoon door.

### Database corruptie

Supabase heeft automatische dagelijkse backups (Pro plan). Point-in-time recovery beschikbaar via dashboard → Database → Backups.
