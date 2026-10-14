# Draaiboek livegang blok A (migratie 036 + app) — audit oktober 2026

**Voor wie:** Bert. **Duur:** ±45 minuten. **Wanneer:** buiten schooltijd (avond of
weekend), uiterlijk wo 22-10, zodat er vóór 27-10 nog ruimte is voor een herstel.

**Waarom alles in één keer:** de nieuwe database verwacht bij het bijwerken van een
klas-inzending een geheim dat alleen de nieuwe app meestuurt. Zet je alleen de
migratie live, dan kunnen leerlingen met de oude app hun inzending niet meer
bijwerken (nieuw inleveren blijft wel werken). Zet je alleen de app live, dan blijven
de lekken open. Dus: **migratie en upload direct na elkaar.**

Achtergrond: `docs/audit-2026-10/` (rapport, fixplan, RLS-matrix, testverslag 036).

---

## 0. Vooraf (kan overdag)

1. **Branch `fix/audit-blok-a` naar `main`.** Laat Claude een pull request openen
   of merge zelf. Controleer daarna op `main`:
   ```bash
   npm run test:run
   ```
   ```bash
   npm run test:db
   ```
   `test:db` moet eindigen met `Na 036 niet groen: geen`.
2. **Back-up.** Supabase-dashboard → Database → Backups: kijk of er een back-up van
   vandaag of gisteren is. Noteer meteen hoe lang je plan back-ups bewaart; dat
   ontbreekt nog in de privacyverklaring.
3. **Lees `supabase/migrations/036_security_hardening.sql` één keer door.** Hij staat
   in één `BEGIN … COMMIT`: lukt één stap niet, dan gebeurt er niets.

## 1. Migratie draaien

1. Supabase-dashboard → SQL Editor → nieuw script.
2. Plak de **hele** inhoud van `supabase/migrations/036_security_hardening.sql` → Run.
3. Verwacht: `Success. No rows returned`. Bij een foutmelding: niets aan de hand
   (de transactie is teruggedraaid). Stop, en stuur de melding naar Claude.

## 2. Direct daarna: app uploaden

```bash
npm run build
```

Upload `dist/` naar Strato **inclusief de verborgen `.htaccess`** (Tier 1 #1). Nieuw
in deze build: de mappen `fonts/` en `privacy/`.

## 3. Controle in de database (2 minuten, alleen lezen)

Plak in de SQL Editor en run. Elke regel moet de verwachte waarde geven:

```sql
begin;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select 'klassen zichtbaar voor anon (verwacht 0)' as controle, count(*)::text as uitkomst from public.classes
union all select 'templates zichtbaar voor anon (verwacht 0)', count(*)::text from public.templates
union all select 'check_rate_limit aanroepbaar door anon (verwacht false)',
  has_function_privilege('anon', 'public.check_rate_limit(text,text,integer,integer)', 'EXECUTE')::text;
rollback;
```

En los daarvan, als beheerder (verwacht `0`):

```sql
select count(*) as leerling_emailadressen from public.submissions where student_email is not null;
```

## 4. Rooktest in de app (20 minuten)

Twee browsers: docent in de ene, leerling in incognito.

| # | Wat | Verwacht |
|---|---|---|
| 1 | Open soundscout.nl in incognito met DevTools → Network | Geen verzoeken naar `fonts.googleapis.com`; het lettertype ziet er normaal uit |
| 2 | Open `soundscout.nl/privacy/` en `/privacy/en/` | De privacyverklaring verschijnt (geen app) |
| 3 | Docent: inloggen, klas openen, opdracht (bijv. vrije compositie) activeren | Werkt zoals altijd; klascode zichtbaar |
| 4 | Leerling: klascode invoeren → Starten → geluid verzamelen → studio → één clip | Normaal |
| 5 | Leerling in de studio: browser-terugknop | Je komt op de **kaart**, niet buiten SoundScout; de clip staat er nog als je teruggaat |
| 6 | Leerling: podium → naam geven → Lever in | "Ingeleverd"; daaronder de bewaarcode met **Kopieer code / Kopieer link / Mail / QR-code** |
| 7 | Docent: klas verversen | Inzending staat er, met een schuilnaam |
| 8 | Leerling: iets veranderen → nog een keer opslaan | Docent ziet **dezelfde** inzending bijgewerkt, met **dezelfde** schuilnaam (geen tweede) |
| 9 | Leerling: "Kopieer link" → plak in een ander browserprofiel | "Gevonden! Waar wil je heen?" → Studio opent het werk |
| 10 | Fout typen: klascode `0000` | "Deze klascode bestaat niet…" (niet "Vrij componeren") |
| 11 | `soundscout.nl/?pp-share=SSDEMO` | De demo werkt; de 4 composities zijn onveranderd |
| 12 | Peer review (als je die gebruikt): één keer sterren geven | Werkt |

Gaat er iets mis bij 3-12: noteer wat je zag en ga naar stap 6 als het leerlingen
blokkeert.

## 5. Afronden

- Laat Claude daarna de Supabase Security Advisor en de live policies opnieuw
  uitlezen (alleen lezen). Die controleert of alles is zoals in de RLS-matrix §7.
- Logregel in het kennisdossier: `dd-mm-jjjj — blok A audit live (migratie 036 +
  build <hash>)`.
- `docs/TESTPLAN-LANCERING.md`: Tier 1 #6 (rooktest klascode) kan daarna op ✓.

## 6. Terugdraaien (alleen als het echt moet)

1. SQL Editor → plak `supabase/rollbacks/036_security_hardening_rollback.sql` → Run.
   Dit zet de oude stand terug, **inclusief de lekken**. De gewiste
   leerling-e-mailadressen komen niet terug.
2. Upload de vorige build (`main` van vóór de merge, bijv. commit `14acaf2`).
3. Laat het Claude weten; dan zoeken we de oorzaak en proberen het opnieuw.

## Bekend en bewust (geen actie)

- Opent een kind de bewaarlink thuis en slaat het daarna op school weer op met het
  oude schoolapparaat, dan komt er één keer een nieuwe inzending bij (geen
  werkverlies).
- De mailknop doet op Chromebooks zonder ingesteld mailprogramma niets; kopiëren
  en QR werken wel overal.
- Snelle winsten die bewust niet in deze ronde zitten: gzip voor JavaScript,
  security-headers, label "Storyboard", taaldetectie, intro-knop op de Chromebook.
  Zie FIXPLAN blok B1.
