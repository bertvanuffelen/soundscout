# PLAN — Voor-docentenpagina (publieke landingspagina)

Datum: 2026-07-01. Vorm afgestemd met Bert via mockups. Dit bestand is de vastgelegde vorm en dient als bouw-spec voor Claude Code.

## Doel

Een **publieke, openbare** pagina op soundscout.nl die een docent die van SoundScout hoort in ~2 minuten van "wat is dit?" naar "dit kan ik volgende week gebruiken" brengt. Staat los van het ingelogde docentendashboard. Dit is de kern van de "docent-verpakking".

## Aanpak (belangrijk)

Bouw dit **eerst als een losse, op zichzelf staande pagina** (eigen route/bestand), nog **niet** gekoppeld aan de startscherm-navigatie of het dashboard. De koppeling volgt in een aparte tweede stap (zie onderaan). Reden: eerst de vorm goed, dan integreren.

## Doelgroep & toon

Persona: de **muziek-minnende leerkracht** — tussen vakdocent en pabo-student. Taal: gewone, correcte muziek-woorden (klank, ritme, herhaling, opbouw), géén jargon, géén notenschrift, collega-tot-collega, niet betuttelend. Sentence case. Nederlands (EN mag later).

## Styling — VERPLICHT: exact de app-stijl

- **Font: Nunito** (Google Fonts, al geladen in `index.html`; weights 400/600/700/800).
- **Design tokens uit `src/index.css` (@theme)** — gebruik de bestaande CSS-variabelen/Tailwind-tokens, verzin GEEN nieuwe kleuren:
  - Pagina-achtergrond: `bg-app` (#F4F6F8). Cards/surfaces: `bg-surface` (#FFFFFF). Borders: `border-subtle` (#E2E8F0).
  - Tekst: `text-main` (#1E293B), `text-muted` (#64748B).
  - Accent/CTA: `accent-400` (#fbbf24) met donkere tekst (zoals de bestaande buttons op het startscherm).
  - Donkere branding: `brand-900` (#0f172a).
  - Radius: `radius-lg`/`radius-xl`; primaire/secundaire knoppen zijn **pill-vormig** (rounded-full) net als op het startscherm.
- **Herbruik bestaande UI-componenten** (`Button`, `Card`, `cn()`), geen nieuwe varianten.
- **Kleurcodering per compositievorm**: gebruik EXACT dezelfde mode-kleuren als in `ComposeModeModal` — afbeelding/praatplaat = teal, storyboard = paars, vrij = amber/accent. Zoek de exacte waarden op in `src/components/.../ComposeModeModal.tsx`.
- **i18n**: alle teksten via `src/i18n/locales/{nl,en}.json` (nl invullen; en mag later).
- Touch-first, `sm:`-breakpoint zoals de rest van de app; 44px touch targets.

## Pagina-opbouw (secties, in volgorde)

### 1. Hero
- Eyebrow: "Gratis · in de browser · Nederlands"
- h1 (belofte): "Laat je klas samen muziek maken bij één beeld"
- Sub: "SoundScout is een lesomgeving waarin leerlingen van 8–12 geluiden verzamelen en samen componeren. Jij deelt een klascode, zij beginnen meteen."
- Twee knoppen: **[Maak een gratis account]** (accent/primair) + **[Inloggen]** (secundair). In stap 1 placeholder-links; koppeling in stap 2.
- Hero-preview: interactief, gestuurd door sectie 2.

### 2. Drie manieren om te componeren (interactief — het hart van de pagina)
- h2 "Drie manieren om te componeren" + subregel "Kies per opdracht de vorm die bij je les past — van samen op het digibord tot vrij experimenteren."
- Drie **klikbare** kaarten:
  - **Praatplaat** (teal) — tag "Samen · digibord" — "De hele klas op één beeld. Elk tweetal verklankt een plek."
  - **Storyboard** (paars) — tag "Verhaal in scènes" — "Drie tot vier beelden vormen een verhaal — soundtrack per scène."
  - **Vrij componeren** (amber) — tag "Open" — "Een klankcompositie zonder beeld — pure verkenning."
- **Interactie**: klik op een kaart → de hero-preview (boven) wisselt naar een beeld dat die vorm representeert + een bijschrift wisselt + de actieve kaart licht op. Standaard: praatplaat. Implementatie: lokale React-state, geen externe libs.
  - Praatplaat-preview: één beeld met een paar genummerde plekken.
  - Storyboard-preview: een filmstrip van 3–4 scènes.
  - Vrij-preview: een tijdlijn met clips, zonder beeld.
  - In stap 1 mogen dit **gestileerde placeholders** zijn; echte screenshots later.
- Bijschrift per vorm:
  - praatplaat: "De hele klas werkt op één beeld en verklankt samen een klanklandschap."
  - storyboard: "Een verhaal in drie tot vier scènes — leerlingen maken een soundtrack per beeld."
  - vrij: "Een klankcompositie zonder beeld — leerlingen bouwen vrij op de tijdlijn."

### 3. Zo zet je een klas op (3 stappen)
1. **Maak een klas** — je krijgt meteen een klascode van vier cijfers.
2. **Kies een opdracht** — activeer een praatplaat, storyboard of template voor je klas.
3. **Deel de klascode** — leerlingen typen de code in en komen er direct in.

### 4. Kant-en-klare leskaarten
- 3 kaarten:
  - **Robotfabriek** (Groep 6–7) — "Verklank samen een fabriek vol robots." — knop "Download pdf" (link placeholder; de PDF komt apart).
  - **Storyboard-verhaal** — badge "Binnenkort".
  - **Vrij componeren** — badge "Binnenkort".

### 5. Sluit aan op de leerlijn muziek (kerndoelen)
- Korte tekst: "SoundScout raakt drie kerndoelen muziek — zo maak je de inzet richting directie en ICC'er verantwoord."
- Drie pills: "54 · luisteren", "55 · spelen en maken", "56 · vastleggen en ontwerpen".
- NB: de kerndoelen worden nog gecontroleerd (nieuwe set op komst) — hou de nummers/teksten makkelijk aanpasbaar via i18n.

### 6. Workshops-CTA (footer-band)
- "SoundScout in je team introduceren? Bert verzorgt workshops voor lerarenteams en pabo's."
- Knop "Bekijk de workshops" → https://bertvanuffelen.nl

## Buiten scope (stap 1)
- Geen koppeling aan startscherm/dashboard/login (stap 2).
- Geen echte leskaart-PDF's (placeholder download-links).
- Geen backend; i18n-EN niet verplicht (nl volstaat).
- Echte screenshots niet verplicht (gestileerde placeholders mogen).

## Stap 2 (later, apart) — koppeling aan de app
- "Ben je docent?"-knop op het **startscherm** → deze pagina (rustige, niet-amber knop; startscherm blijft minimaal).
- Hero-knoppen "Inloggen" / "Maak een gratis account" → bestaande teacher-login/registratie.
- Registratie: korte contextregel toevoegen ("Gratis. Je krijgt meteen een klascode om te delen met je klas."); "Terug naar SoundScout" → "Terug naar docentenpagina".

## Verificatie & afsluiting
- `npx tsc -b --noEmit` + `npm run test:run` groen.
- Reviewbranch, niet direct op main.

---

## Ronde 2 — aanpassingen na review (2026-07-02)

Verwerk deze bovenop de bestaande pagina.

1. **HeroPreview-animatie (optioneel — pas na akkoord op de animatie-mock).** Voeg subtiele animatie toe: (a) zachte overgang (fade/slide) bij het wisselen van vorm; (b) één rustige loop per vorm — een playhead die over de tijdlijn veegt (vrij), pulserende plekken (praatplaat), scènes die om beurten oplichten (storyboard). Respecteer `prefers-reduced-motion` (geen loop als die aanstaat). CSS-transforms, geen zware JS. **Wacht op de goedgekeurde animatie-mock voordat je dit bouwt.**

2. **Kleur-fix van de drie compose-variant-kaarten.** Haal de volle gekleurde rand weg; maak de kaarten neutraal (witte surface, `border-subtle`) en zet de vormkleur alléén in het icoon en de tag-pill. Reden: drie volle kleurranden op wit náást elkaar botsen; als klein, begrensd accent vormen ze wél een set. Mode-kleuren blijven teal/paars/amber uit ComposeModeModal.

3. **Teksten via i18n bevestigen.** Controleer dat álle paginateksten in `src/i18n/locales/nl.json` staan onder één docentenpagina-namespace (geen hardcoded strings in componenten), zodat teksten zonder code te wijzigen zijn. Corrigeer waar nodig.

4. **"Naar je dashboard"-knop bij "Zo zet je een klas op".** Voeg ná de drie stappen een knop toe: ingelogd → docentendashboard, niet ingelogd → eerst login (daarna door naar dashboard). Dit is auth-wiring → hoort bij stap 2 (koppeling); plaats de knop nu, wire de redirect bij het koppelen.

5. **Leskaarten als master-detail (klikbaar).** Vervang de drie losse leskaart-kaarten door een twee-koloms indeling: links een selecteerbare lijst leskaarten, rechts de gekozen les in een kader (lesdoel, de vier fasen van het creatief proces, opdracht, download-knop). "Binnenkort"-kaarten tonen rechts een korte placeholder. Op mobiel stapelen (lijst boven, paneel eronder — of accordion). De inhoud van het rechterpaneel = dezelfde inhoud als de leskaart-PDF (één keer ontwerpen). Kaart 1 = Robotfabriek (inhoud komt apart aan).

6. **Sectie "Zo werkt het — in beeld".** Voeg een sectie met twee korte demo-video's toe (leerling- + docent-perspectief), geplaatst ná "Drie manieren om te componeren". In stap 1 mogen dit placeholders/embeds zijn. De langere how-to-instructievideo's horen NIET op deze publieke pagina (die horen in dashboard/help).
