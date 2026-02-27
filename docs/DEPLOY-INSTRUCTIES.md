# Deploy Instructies — SoundScout op Strato

## Wat je nodig hebt

- Toegang tot je Strato-server (via FTP of bestandsbeheer)
- Node.js op je computer (voor het bouwen)

---

## Stap 1: Productie-build maken

Open een terminal in de SoundScout map en draai:

```bash
npm run build
```

Dit maakt een `dist/` map aan met alle bestanden voor de website. Het controleert ook automatisch op TypeScript-fouten.

---

## Stap 2: Bestanden uploaden naar Strato

Upload de **inhoud** van de `dist/` map naar je Strato-server. Niet de map zelf, maar alles wat erin zit.

Je uploadt dus:

```
dist/
├── index.html          → naar de root van je website
├── .htaccess           → naar de root van je website
├── manifest.json       → naar de root van je website
├── assets/             → complete map uploaden
├── audio/              → complete map uploaden
└── images/             → complete map uploaden
```

**Belangrijk:** De `.htaccess` is een verborgen bestand (begint met een punt). Je FTP-programma toont deze mogelijk niet standaard. Zet "verborgen bestanden tonen" aan in je FTP-instellingen.

---

## Stap 3: Controleer of .htaccess werkt

De `.htaccess` doet drie dingen:

**1. URL-routing** — Zorgt dat directe links werken (bijv. als iemand de pagina herlaadt). Zonder dit krijg je een 404-fout.

**2. Caching** — Audio, afbeeldingen en scripts worden door de browser opgeslagen zodat ze niet elke keer opnieuw geladen hoeven worden. HTML wordt elk uur ververst zodat updates snel zichtbaar zijn.

**3. Beveiliging (CSP)** — Blokkeert ongeautoriseerde scripts en verbindingen. Alleen jouw domein, Supabase en EmailJS zijn toegestaan.

### Hoe te testen

Open de website in Chrome en druk op F12 (DevTools). Ga naar het tabblad "Console". Als je rode foutmeldingen ziet met "Content Security Policy" erin, dan blokkeert de CSP iets wat wel nodig is. Laat het me weten en ik pas de regel aan.

### Mod_rewrite en mod_headers

De `.htaccess` vereist dat Apache twee modules heeft ingeschakeld: `mod_rewrite` en `mod_headers`. Bij Strato staan deze standaard aan. Als URL-routing of caching niet werkt, controleer dan of deze modules actief zijn in je Strato-configuratiepaneel.

---

## Environment-bestanden (.env)

### Wat zijn dit?

De `.env` bestanden bevatten configuratie zoals je Supabase-URL en EmailJS-keys. Ze worden **niet** mee geüpload naar de server — Vite bakt de waarden in tijdens het bouwen.

### Welk bestand wanneer?

| Bestand | Wanneer geladen | In git? |
|---------|----------------|---------|
| `.env.local` | `npm run dev` (lokaal ontwikkelen) | Nee |
| `.env.production` | `npm run build` (productie) | Nee |
| `.env.example` | Nooit (template/referentie) | Ja |

### Huidige situatie

Je hebt nu één `.env.local` met je Supabase- en EmailJS-keys. Omdat er geen `.env.production` bestaat, gebruikt `npm run build` automatisch ook de waarden uit `.env.local`. Dit werkt prima zolang je dezelfde Supabase-database gebruikt voor development en productie.

### Wanneer heb je een apart .env.production nodig?

Alleen als je ooit:
- Een apart Supabase-project wilt voor testdata vs echte data
- Andere EmailJS-instellingen wilt voor productie
- Een andere `VITE_APP_URL` wilt instellen

**Nu hoef je hier niets mee te doen.** Je huidige opzet werkt gewoon.

---

## Samenvatting: wat je uploadt

Bij elke update:

1. `npm run build`
2. Upload de inhoud van `dist/` naar je Strato-server
3. Klaar

De `.htaccess` hoef je maar één keer te uploaden (tenzij deze verandert).
