# Freemium-opties — beslisdocument (17-7-2026)

> **Doel**: Bert kiest op basis van dit document welke grenzen gratis blijven en wat betaald wordt.
> **Vast uitgangspunt (voorstel)**: *de leerling-kant kent nooit een limiet.* Een kind met een klascode kan altijd volledig componeren, inleveren, exporteren en terugluisteren — grenzen zitten uitsluitend aan de docent-kant. Dit beschermt de onderwijswaarde én voorkomt dat een les midden in de klas stukloopt op een betaalmuur.
> **Context betaalflow**: docent-abonnement (maand/jaar), provider volgt uit Berts externe onderzoek (Mollie/Stripe); de code wordt provider-agnostisch voorbereid (entitlements-laag).

---

## 1. De twaalf usecases (wie is de docent, wat doet die, wat is die bereid te betalen?)

| # | Persona | Gebruik | Betalingsbereidheid |
|---|---|---|---|
| U1 | **De voorzichtige starter** — groepsleerkracht groep 5, één les proberen na een tip van een collega | 1 klas, 1 leskaart, 1 lesuur. Haakt af bij élke drempel vóór de eerste les. | Nul — moet eerst succes voelen. |
| U2 | **De enthousiaste herhaler** — zelfde docent, drie weken later | 1-2 klassen, wil historie terugzien en een tweede project starten. | Laag; dit is hét conversie-moment als een limiet *voelbaar maar niet blokkerend* is. |
| U3 | **De vakleerkracht muziek** — 10-14 groepen op 2 scholen, wekelijks | Veel klassen, veel inzendingen, presenteert op digiborden, gebruikt alles. | Hoog — dit is de kernbetaler. SoundScout vervangt lesvoorbereiding. |
| U4 | **Het duo-partnerschap** — twee parttimers delen groep 6 | Willen samen bij dezelfde klas kunnen (nu: één account of wachtwoord delen). | Middel; betalen eerder voor gemak (gedeelde klas) dan voor volume. |
| U5 | **De ICC'er/kartrekker** — wil SoundScout schoolbreed uitrollen | Overtuigt 8 collega's, wil niet 8 losse abonnementen regelen. | School betaalt — per factuur, niet per iDeal. Wil een teamlicentie met beheer. |
| U6 | **De invaller** — staat morgen voor een onbekende groep | Grijpt een ingebouwde leskaart, klascode op het bord, klaar. Geen eigen materiaal. | Vrijwel nul; maar elke invaller is een zaadje op een nieuwe school. |
| U7 | **De pabo-docent (Bert-achtige)** — leidt studenten op | Demonstreert alles, veel klassen (studentgroepen), wisselt per blok. | Instelling kan betalen; wil vooral geen limiet tijdens college. |
| U8 | **De thema-werker** — school werkt 3 weken projectmatig | Piekgebruik: even alles nodig (praatplaten, storyboards, presenteren), daarna maanden stil. | Maandabonnement aan/uit, of accepteert een jaarprijs als die laag genoeg is. |
| U9 | **De BSO/muziekschool-begeleider** — buitenschools, wisselende groepjes | Kleine groepen, veel verloop, hecht aan exports (mp3/video voor ouders). | Middel; commerciëler context, minder prijsgevoelig dan school. |
| U10 | **De internationale docent** (later) — EN-interface | Zelfde als U1-U3 maar betaalt in €/andere valuta via creditcard. | Als NL; vereist Stripe-achtige afhandeling. |
| U11 | **De ouder thuis** (onbedoeld publiek) — kind wil thuis verder | Geen klas, geen docent; gebruikt "Nieuwe compositie" en bewaarcodes. | Nul, en dat is prima — thuisgebruik is gratis reclame. |
| U12 | **De school-per-factuur** — directie koopt in via bestelbon | Wil offerte, factuur, jaarcontract, meerdere docent-accounts onder één betaling. | Betaalt het meest, maar alleen via de factuur-route (geen self-service). |

**Wat de usecases samen zeggen:**
- Het conversie-moment zit bij U2→U3: *meer klassen en doorlopend gebruik*. Niet bij de eerste les (U1/U6 moeten gratis frictieloos zijn).
- U5/U12 vragen om een aparte **school/team-route** (factuur + meerdere accounts) — hoeft niet in v1, maar het prijsmodel moet er ruimte voor laten.
- Niemand in de lijst wordt overtuigd door het afknijpen van *leerling*-functionaliteit; wél door docent-gemak (klassen, historie, beheer).

---

## 2. De drie grensmodellen, gespiegeld

### Model A — Klassen-limiet (gratis: 2 klassen · betaald: 8+)

| | |
|---|---|
| **Hoe het voelt** | Eerlijk en glashelder: "proberen is gratis, structureel gebruiken kost wat". U1/U2/U6 merken er niets van; U3 (10+ groepen) converteert vanzelf. |
| **Waar het knelt** | U7 (pabo, veel wisselende groepen) en U8 (piekgebruik) voelen de limiet terwijl ze geen veelverdieners zijn. Workaround-gevoelig: docent kan klassen verwijderen/hergebruiken (acceptabel — wie dat doet, betaalt toch nooit). |
| **Conversie-logica** | Limiet is zichtbaar op het juiste moment (3e klas aanmaken) met een nette upgrade-melding — geen verrassing midden in een les. |
| **Technisch** | Klein: één check in `createClass` + entitlements-vlag. Bestaande "max 8"-check wordt de betaalde tier. |

### Model B — Premium content (kern gratis · nieuwe thema's/leskaarten premium)

| | |
|---|---|
| **Hoe het voelt** | Bekend model (methodes werken zo). De gratis kern blijft volwaardig; premium voelt als "extra lesmateriaal kopen". |
| **Waar het knelt** | Vereist een *doorlopende contentmotor* (elke maand iets nieuws, anders is er geen reden om te blijven betalen). Seizoensthema's als premium botst met de seizoensregel-charme. U6 (invaller) ziet mogelijk vooral sloten. En: onze ingebouwde leskaarten zijn nu juist de SEO-/onboarding-motor — die achter een muur zetten schaadt de groei. |
| **Conversie-logica** | Zwakker dan A: content-honger is grillig; docenten hergebruiken graag. |
| **Technisch** | Middel: premium-vlag op leskaarten/thema's + lock-states in alle kiezers + preview-gedrag. Raakt veel schermen. |

### Model C — Premium docent-features (basis gratis · power-tools betaald)

Kandidaat-premiumfeatures: video-export, klas-album, feedback-tools/peer-sterren-overzicht, muzikaal paspoort (later), leerling-codes/groepjes (later), analytics per klas.

| | |
|---|---|
| **Hoe het voelt** | "Pro-versie voor wie meer wil" — herkenbaar uit andere SaaS. |
| **Waar het knelt** | Snijdt in de onderwijswaarde: feedback en presenteren zijn juist het hart van SoundScout — daar een slot op zetten ondergraaft het verhaal van de landingspagina. Video-export premium maken raakt indirect tóch de leerling (die zijn eigen werk wil hebben). |
| **Conversie-logica** | Redelijk, maar elke feature achter een muur is er ook één minder in mond-tot-mond ("moet je zien wat mijn juf kan met..."). |
| **Technisch** | Middel: feature-flags verspreid door docent- én podium-schermen. |

---

## 3. Drie concrete pakketvoorstellen (kies of combineer)

### Voorstel 1 — "Klassen als kraan" *(aanbeveling)*
- **Gratis**: 2 klassen, alle content, alle features, leerling-kant onbeperkt.
- **SoundScout Plus** (richtprijs **€6/maand of €49/jaar**): tot 12 klassen, plus toekomstige power-tools (leerling-codes/groepjes, klas-album, analytics) vallen hier automatisch onder.
- **School** (later, per factuur, richtprijs **€199/jaar per school**): onbeperkt docenten, teambeheer.
- *Waarom*: simpelst uit te leggen, kleinste bouw, raakt U1/U6 niet, vangt U3/U5 precies.

### Voorstel 2 — "Klassen + power-tools"
- Als voorstel 1, maar de gratis laag heeft ook feature-grenzen: geen video-export en geen klas-album (wel mp3). Plus krijgt alles.
- Richtprijs Plus **€5/maand of €39/jaar** (lager, want de gratis laag is krapper).
- *Waarom*: sterkere reden tot upgraden voor U8/U9; prijs kan lager. Nadeel: twee soorten grenzen om uit te leggen.

### Voorstel 3 — "Alles gratis, school betaalt"
- Individuele docenten volledig gratis (max 8 klassen zoals nu); alleen de **school-licentie** bestaat (factuur, €149-249/jaar): teambeheer, gedeelde klassen (U4/U5), prioriteitsupport, dashboard.
- *Waarom*: maximale groei en goodwill; monetisatie via de kanalen die tóch al per factuur willen. Nadeel: omzet komt langzaam en vergt actieve schoolwerving.

---

## 4. Wat ik van Bert nodig heb (beslisvragen)

1. **Welk voorstel** (of welke combinatie)? Mijn advies: start met voorstel 1 — grenzen bijstellen kan altijd, terughalen van gratis features niet.
2. **Bevestig het principe** "leerling-kant nooit gelimiteerd" als hard uitgangspunt (ook voor de toekomst, bv. exports).
3. **De getallen**: gratis-klassenlimiet (1, 2 of 3?), Plus-limiet (8, 12, onbeperkt?), richtprijzen akkoord?
4. **Bestaande gebruikers**: iedereen die vóór de lancering een account had — grandfatheren (alles houden) of meeverhuizen naar de gratis laag?
5. Uitkomst van het **externe betaalonderzoek** (provider, BTW, voorwaarden) zodra je die hebt.
