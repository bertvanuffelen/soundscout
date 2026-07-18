# USECASES-QA — volledige UX/UI-doorloop per perspectief

**Doel**: de hele app doorlopen zoals een echte gebruiker dat doet — leerling én docent — met per usecase een status en bevinding. Dit is een rol-catalogus; regressie-hertests per bouwronde staan in [TESTPLAN-MASTERPLAN.md](TESTPLAN-MASTERPLAN.md).

**Uitvoering**: Claude in de preview-browser (poort 5199), 18-7. Docent-usecases in Berts ingelogde sessie (testdata met prefix "QA-", na afloop opgeruimd). Statussen: ✅ werkt zoals verwacht · ⚠️ werkt met kanttekening / deels verifieerbaar · ❌ bug (met verwijzing naar fix of open bevinding) · ⏳ nog niet uitgevoerd.

## Bevindingenoverzicht

*(wordt gevuld tijdens de doorloop — gefixt / open met voorstel)*

---

## Perspectief LEERLING

| ID | Usecase | Stappen | Verwacht | Status | Bevinding |
|---|---|---|---|---|---|
| L1 | Eerste bezoek + onboarding | App openen met lege localStorage → "Nieuwe Compositie" | First-run intro (OnboardingAnimation) verschijnt éénmalig, daarna de wizard | ⏳ | |
| L2 | Vrij componeren starten | Nieuwe compositie → Vrij componeren → Volgende → thema kiezen | Kies-je-wereld toont publieke thema's; na keuze land je op de kaart | ⏳ | |
| L3 | Bij een afbeelding | Nieuwe compositie → Bij een afbeelding → afbeelding kiezen | Afbeeldingkiezer toont beelden; na keuze kaart + storytelling-paneel met het beeld | ⏳ | |
| L4 | Bij een storyboard | Nieuwe compositie → Bij een storyboard → storyboard kiezen | Storyboardkiezer; na keuze kaart; studio toont filmstrip + secties (gelockt) | ⏳ | |
| L5 | Seizoensthema-chip | Startscherm bekijken | Chip alleen zichtbaar als een publiek thema seizoensgebonden actief is; klik → wizard met dat thema | ⏳ | |
| L6 | Geluiden verzamelen (hotspots) | Kaart → locatie → hotspots aanklikken | Geluid speelt, sample komt in recorder-slot (max 6); teller op de kaart loopt mee | ⏳ | |
| L7 | Recorder → studio | 6 slots vullen → naar studio | Samples staan in de bibliotheek, gegroepeerd; slots geleegd | ⏳ | |
| L8 | Clips slepen + smart snap | Sample naar spoor slepen; tweede clip er overheen slepen | Snap-preview (gestippeld); botsende clip schuift naar vrije plek of spoor eronder | ⏳ | |
| L9 | Clip bewerken — alle 6 acties | Clip selecteren → label, trim, dupliceer, volume, effecten, verwijder | Elke actie werkt vanuit de werkbalk; effecten-modal met fade-handles + preview | ⏳ | |
| L10 | Clip-loop | Clip selecteren → resize-handle naar rechts slepen | Loopt in halve-maat-stappen; herhaalt bij afspelen; botsingsdetectie loop-bewust | ⏳ | |
| L11 | Afspelen, pauze, seek, loop | Play → pauze → playhead verplaatsen → loop aan | Audio klopt met tijdlijn; hervatten op juiste positie; loop springt terug | ⏳ | |
| L12 | Tijdlijn-gereedschap | +8/−8 maten, + spoor (max 12), solo, zoom in/uit/fit | Alles reageert; −8 klemt op inhoud; solo dimt andere sporen hoorbaar | ⏳ | |
| L13 | Secties + sectie-loop | Vlag-knop → sectie markeren → sectie-loop aanzetten | Sectie in de balk; loop speelt alleen dat deel | ⏳ | |
| L14 | Undo/redo + tijdlijn wissen | Wijzigingen → undo/redo; gum → inline bevestiging | Historie klopt; wissen vraagt bevestiging en leegt alle sporen | ⏳ | |
| L15 | Praatplaat-zoom in studio | (Via klascode-praatplaat) studio openen | Beeld 2,5× ingezoomd op gekozen plek; toggle naar volledig beeld werkt | ⏳ | |
| L16 | Podium + lokaal opslaan | Naar podium → Opslaan & Delen → lokaal opslaan | Compositie in "Mijn composities" (max 10); succes-feedback | ⏳ | |
| L17 | Online bewaarcode + QR | Opslaan & Delen → online bewaren | 6-cijferige code + QR-toggle; auto-sync-toast bij latere saves | ⏳ | |
| L18 | Bewaarcode op "ander apparaat" | Startscherm → Ik heb een code → 6-char code | Keuzescherm Studio/Podium; compositie laadt volledig | ⏳ | |
| L19 | MP3- en video-export | Opslaan & Delen → MP3; bij storyboard ook video | Voortgang zichtbaar, download start; fouten netjes gemeld | ⏳ | |
| L20 | Deel-link (8-char) | Opslaan & Delen → deel-link maken → link openen | SharedPlayer met gesture-gate; compositie speelt af | ⏳ | |
| L21 | Klascode → 4 opdrachttypen | 4-cijferige code invoeren (template/praatplaat/storyboard/vrij) | AssignmentLanding toont opdrachtkaart; "Starten" routeert per type correct | ⏳ | |
| L22 | Klascode zonder actieve opdracht (Route C) | Code van klas zonder opdracht | Nette landing met "Vrij componeren" / "Andere code" | ⏳ | |
| L23 | Praatplaat: plek kiezen + inleveren + nieuwe plek | Praatplaat-flow → plek → componeren → inleveren | Positie bewaard; succes-modal; "Kies een nieuwe plek"-knop verschijnt | ⏳ | |
| L24 | Peer review | Na inleveren → "Luister naar klasgenoten" | ≤3 anonieme composities, sterren per criterium; venster/cap eerlijk gemeld | ⏳ | |
| L25 | Feedback-thuis | Met bewaarcode van beoordeelde compositie terugkomen | "Je hebt een reactie!"-melding op start; feedbackblok op podium | ⏳ | |
| L26 | Composities hervatten | Mijn composities → kaart openen | Compositie laadt in studio; verwijderen met bevestiging | ⏳ | |
| L27 | Tutorial + video's | Hoe werkt het? → video starten | Animatie + stappen; YouTube-embed speelt (playsinline) | ⏳ | |
| L28 | 8-char-keten overige codes | Template-code, pp-share-code, album-code invoeren | Elke soort routeert naar de juiste viewer; onbekende code → "niet gevonden" | ⏳ | |
| L29 | Mobiel (375px) kernflow | L2+L6+L8+L16 op mobiel formaat | Alles bedienbaar; touch-targets ruim; geen horizontale scroll | ⏳ | |
| L30 | EN-doorloop leerling | Taal → EN → L2/L6/L16 kort herhalen | Alle teksten Engels, geen NL-restjes of lege keys | ⏳ | |

## Perspectief DOCENT

| ID | Usecase | Stappen | Verwacht | Status | Bevinding |
|---|---|---|---|---|---|
| D1 | Teacher-landing | /teacher openen, beide tabs, video's, thema-links | Alles rendert; leskaart-blok met 4 kaarten + "Bekijk de leskaart"-links | ⏳ | |
| D2 | Statische leskaart-pagina's | /les/robotfabriek e.a. → CTA "Open voor je klas" | Pagina volledig; CTA → login → dashboard op juiste leskaart | ⏳ | |
| D3 | Login + foutpaden | Verkeerd wachtwoord, dan goed inloggen | Nette foutmelding; daarna dashboard | ⏳ | |
| D4 | Registratie + wachtwoord-vergeten (UI) | Schermen openen, validatie checken | Velden valideren; reset-mail-flow alleen UI-check (echte mail = aparte test) | ⏳ | |
| D5 | Dashboard-tabs + deeplink | 3 tabs; ?screen=teacher&lesson=drumbeat | Tabs wisselen; deeplink opent Leskaarten-tab op die kaart (ook door login-hop) | ⏳ | |
| D6 | Klas aanmaken + klascode | Mijn klassen → QA-klas aanmaken | Klas met 4-cijferige code; zichtbaar op kaart | ⏳ | |
| D7 | Startkeuze in klaslokaal | QA-klas → "Gebruik een leskaart" / "Stel zelf samen" | Beide ingangen openen de juiste picker | ⏳ | |
| D8 | Opdracht activeren — template | Zelf samenstellen → template kiezen | Actieve opdrachtkaart in klaslokaal; leerling-kant toont hem (L21) | ⏳ | |
| D9 | Opdracht activeren — praatplaat (catalogus) | Type praatplaat → catalogusbeeld kiezen | Instance per (klas+beeld); heractiveren hergebruikt hem | ⏳ | |
| D10 | Opdracht activeren — storyboard + vrij | Beide typen activeren | Correcte kaarten; wisselen vraagt om bevestiging | ⏳ | |
| D11 | Leskaart activeren via picker | Leskaarten-tab → kaart → activeren op QA-klas | One-click; klascode groot in succes; vervang-waarschuwing bij actieve opdracht | ⏳ | |
| D12 | Leskaarten-filters + seizoen | Thema/niveau-chips; buiten-seizoen kaart activeren | Filters werken; badge + zachte bevestiging (nooit blokkeren) | ⏳ | |
| D13 | Eigen leskaart authoren | Nieuwe leskaart (type → resource → opdrachtkaart → presentatie) | Kaart verschijnt bij eigen leskaarten; bewerken + verwijderen werkt | ⏳ | |
| D14 | Opdrachtkaart maken + koppelen | Mijn materiaal → opdrachtkaart → aan opdracht koppelen | Leerling ziet de kaart op de assignment-landing | ⏳ | |
| D15 | "Bewaar als opdracht" + "maak er een leskaart van" | Podium (als docent) → template opslaan → leskaart ervan maken | Template-code; prefilled leskaart-editor; kaart in Leskaarten-tab | ⏳ | |
| D16 | Inzendingen + In bewerking | Leerling levert in (L21) → klaslokaal bekijken | Inzending in juiste tab; WIP-badge voor niet-ingeleverd werk | ⏳ | |
| D17 | Feedback geven | Inzending openen → sticker + sterren + tekst | Opgeslagen; status-dot; leerling ziet het via bewaarcode (L25) | ⏳ | |
| D18 | Peer-instellingen + overzicht | Peer-review aanzetten (feedbackkaart, venster) → overzicht | Leerling-kant kan reviewen (L24); overzicht + top 3 kloppen | ⏳ | |
| D19 | Presentatie op digibord | Presenteren → zijpaneel, fullscreen, montagelijn, doorspelen | PresentationSurface volledig; auto-advance; Escape-gedrag correct | ⏳ | |
| D20 | Praatplaat-viewer + delen | Actieve praatplaat → bekijken → spots klikken → delen | Spots spelen composities; share-code + publieke viewer werkt | ⏳ | |
| D21 | Album delen | Actieve opdracht → "Deel album" → link openen (incognito) | Code + QR; publiek album speelt alle ingeleverde composities (vergt migratie 031) | ⏳ | |
| D22 | Historie | Eerdere opdrachten: heractiveren / bekijken / verwijderen | Alle drie de acties werken; verwijderen waarschuwt bij inzendingen | ⏳ | |
| D23 | Statistieken-paneel | Header → Statistieken (admin-account) | Grafiek + tabel laden; niet-admin ziet de knop niet | ⏳ | |
| D24 | Docentengids | Gids openen, secties, video's | Structuur + ingebedde video's werken | ⏳ | |
| D25 | Klas verwijderen + max 8 | QA-klas verwijderen; limiet-check | Bevestigingsmodal; teller klopt; testdata opgeruimd | ⏳ | |
| D26 | EN-doorloop docent | Dashboard-header → EN → D5/D7/D11 kort herhalen | Alle dashboard-teksten Engels, incl. foutmeldingen (errors.*) | ⏳ | |

---

## Uitvoeringsnotities

- Audio vergt een klik-gesture in de browser; exports en downloads worden geverifieerd op UI-status + console/netwerk (geen bestandsinspectie).
- Echte-apparaat-checks (iPad-video, downloadbestanden openen) blijven bij Bert; hier gemarkeerd als ⚠️ met wat wél is geverifieerd.
