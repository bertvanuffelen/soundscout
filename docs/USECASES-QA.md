# USECASES-QA — volledige UX/UI-doorloop per perspectief

**Doel**: de hele app doorlopen zoals een echte gebruiker dat doet — leerling én docent — met per usecase een status en bevinding. Dit is een rol-catalogus; regressie-hertests per bouwronde staan in [TESTPLAN-MASTERPLAN.md](TESTPLAN-MASTERPLAN.md).

**Uitvoering**: Claude in de preview-browser (poort 5199), 18-7. Docent-usecases in Berts ingelogde sessie (testdata met prefix "QA-", na afloop opgeruimd). Statussen: ✅ werkt zoals verwacht · ⚠️ werkt met kanttekening / deels verifieerbaar · ❌ bug (met verwijzing naar fix of open bevinding) · ⏳ nog niet uitgevoerd.

## Bevindingenoverzicht

**Gefixt tijdens de doorloop (18-7):**
- **QA-1 (L10, gefixt `02d3cd8`)**: clip-loop-resize kon over de volgende clip op hetzelfde spoor heen groeien (beide klonken tegelijk) — `resizeClipLoop` kent geen botsingen. De resize-handler klemt nu op de start van de eerstvolgende clip; browser-geverifieerd (loop stopt pixel-exact op de volgende clip).

**Open — klein, met voorstel:**
- **QA-2 (L13)**: "Markeer deel" is een stille no-op als de afspeellijn op 0 staat (`handleMarkSection` eist beat > 0). Een kind dat vóór het afspelen klikt krijgt géén feedback. Voorstel: knop disabled + title-hint wanneer `currentBeat === 0` (goedkoop te abonneren via boolean-selector `s.currentBeat > 0`).
- **QA-3 (L18)**: na laden via bewaarcode → keuze "Podium" is de compositienaam-input op het podium leeg, terwijl de compositie wél een naam heeft (deellink toont hem correct). Voorstel: naam voorvullen in `openSavedComposition`/stage-init.
- **QA-4 (L5, content-config)**: **Winterspelen** heeft geen seizoensvenster (`activeFrom/activeUntil` ontbreken) en staat dus ook in juli in de leerling-kiezer. Bewust? Zo niet: venster instellen (bijv. 12-01 t/m 03-15). **Piraten** staat nog op `isPublic: true` (bekende TODO uit de piraten-sessie: terugzetten vóór deploy).
- **QA-5 (observatie)**: HMR-editing terwijl de studio openstaat kan clip-selectie stil breken (volle reload lost op) — geen productie-issue, wel goed om te weten bij live testen tijdens bouwsessies.
- **QA-6 (D6)**: de "max 8 klassen"-limiet uit de documentatie wordt niet gehandhaafd — klas #15 aanmaken lukte gewoon. Bewust losgelaten (dan CLAUDE.md aanpassen) of alsnog afdwingen (relevant voor de freemium-grenzen, R2)?
- **QA-7 (L21/D8)**: bij een template-opdracht zonder eigen opdrachtkaart toont de assignment-landing de práátplaat-default ("Je kiest straks een plek op de afbeelding…") i.p.v. de template-default. Vermoedelijk pakt de default-kaart-keuze niet het juiste `assignmentCards.defaults.{type}` — of de drumbeat-seed (023) heeft een verkeerde `card_inline`. Voorstel: default per `assignment_type` verifiëren in `AssignmentLandingScreen`/`OpdrachtkaartCard`.
- **QA-8 (D21, gefixt)**: het album-wachtscherm gebruikte de praatplaat-tekst ("…om de praatplaat te openen"); nieuwe key `album.gestureHint` (NL+EN), browser-geverifieerd.
- **QA-9 (D20)**: de praatplaat-viewer toont in de **lege staat** (nog geen inzendingen) het beeld klein linksboven i.p.v. gemaximaliseerd; met inzendingen was het beeld eerder wél maximaal (M5). Voorstel: wrapper-hoogte in de lege staat op de surface-hoogte klemmen.

---

## Perspectief LEERLING

| ID | Usecase | Stappen | Verwacht | Status | Bevinding |
|---|---|---|---|---|---|
| L1 | Eerste bezoek + onboarding | App openen met lege localStorage → "Nieuwe Compositie" | First-run intro (OnboardingAnimation) verschijnt éénmalig, daarna de wizard | ✅ | First-run intro verschijnt eenmalig op schone staat; daarna direct de wizard |
| L2 | Vrij componeren starten | Nieuwe compositie → Vrij componeren → Volgende → thema kiezen | Kies-je-wereld toont publieke thema's; na keuze land je op de kaart | ✅ | Wizard → thema-kiezer (De Stad/Winterspelen/Piraten) → kaart |
| L3 | Bij een afbeelding | Nieuwe compositie → Bij een afbeelding → afbeelding kiezen | Afbeeldingkiezer toont beelden; na keuze kaart + storytelling-paneel met het beeld | ✅ | Afbeeldingkiezer (4 beelden) → studio met beeld + Geluiden/Beeld-toggle |
| L4 | Bij een storyboard | Nieuwe compositie → Bij een storyboard → storyboard kiezen | Storyboardkiezer; na keuze kaart; studio toont filmstrip + secties (gelockt) | ✅ | Verspringen → studio met filmstrip "1/3" en gelockte secties Start/Sprong/Landing |
| L5 | Seizoensthema-chip | Startscherm bekijken | Chip alleen zichtbaar als een publiek thema seizoensgebonden actief is; klik → wizard met dat thema | ⚠️ | Geen chip zichtbaar — geen enkel publiek thema heeft een seizoensvenster; zie QA-4 |
| L6 | Geluiden verzamelen (hotspots) | Kaart → locatie → hotspots aanklikken | Geluid speelt, sample komt in recorder-slot (max 6); teller op de kaart loopt mee | ✅ | 6 hotspots Speeltuin → recorder 6/6, geluid speelt, vol-prompt verschijnt |
| L7 | Recorder → studio | 6 slots vullen → naar studio | Samples staan in de bibliotheek, gegroepeerd; slots geleegd | ✅ | Alle 6 samples in de bibliotheek na "Naar Studio" |
| L8 | Clips slepen + smart snap | Sample naar spoor slepen; tweede clip er overheen slepen | Snap-preview (gestippeld); botsende clip schuift naar vrije plek of spoor eronder | ✅ | Drag werkt; overlappende drop schuift automatisch achter de blokkerende clip |
| L9 | Clip bewerken — alle 6 acties | Clip selecteren → label, trim, dupliceer, volume, effecten, verwijder | Elke actie werkt vanuit de werkbalk; effecten-modal met fade-handles + preview | ✅ | Label (QA-zoem), trim-modal, dupliceren, volume-popover, effecten (pitch +4 toegepast), verwijderen — allemaal in orde |
| L10 | Clip-loop | Clip selecteren → resize-handle naar rechts slepen | Loopt in halve-maat-stappen; herhaalt bij afspelen; botsingsdetectie loop-bewust | ✅ | Bug gevonden en gefixt: loop groeide over de volgende clip heen (QA-1, commit 02d3cd8); clamp nu browser-geverifieerd |
| L11 | Afspelen, pauze, seek, loop | Play → pauze → playhead verplaatsen → loop aan | Audio klopt met tijdlijn; hervatten op juiste positie; loop springt terug | ✅ | Play/pauze/rewind/loop-toggle reageren; geen console-errors tijdens playback |
| L12 | Tijdlijn-gereedschap | +8/−8 maten, + spoor (max 12), solo, zoom in/uit/fit | Alles reageert; −8 klemt op inhoud; solo dimt andere sporen hoorbaar | ✅ | +8 (32→40 maten), + spoor (8→9), solo dimt de andere sporen, zoom in/uit |
| L13 | Secties + sectie-loop | Vlag-knop → sectie markeren → sectie-loop aanzetten | Sectie in de balk; loop speelt alleen dat deel | ✅ | Secties verschijnen als gekleurde balken; wel stille no-op op beat 0 (QA-2) |
| L14 | Undo/redo + tijdlijn wissen | Wijzigingen → undo/redo; gum → inline bevestiging | Historie klopt; wissen vraagt bevestiging en leegt alle sporen | ✅ | Wis-tijdlijn met inline "Alles wissen?"-bevestiging; undo/redo-knoppen aanwezig (niet diepgaand doorlopen) |
| L15 | Praatplaat-zoom in studio | (Via klascode-praatplaat) studio openen | Beeld 2,5× ingezoomd op gekozen plek; toggle naar volledig beeld werkt | ✅ | Zoom 2,5× op gekozen plek (transform-origin klopt met klikpositie) + toggle aanwezig |
| L16 | Podium + lokaal opslaan | Naar podium → Opslaan & Delen → lokaal opslaan | Compositie in "Mijn composities" (max 10); succes-feedback | ✅ | "Opgeslagen!"-feedback; compositie in Mijn Composities |
| L17 | Online bewaarcode + QR | Opslaan & Delen → online bewaren | 6-cijferige code + QR-toggle; auto-sync-toast bij latere saves | ✅ | Bewaarcode QDHEXK aangemaakt (Supabase), QR-toggle toont scanbare code |
| L18 | Bewaarcode op "ander apparaat" | Startscherm → Ik heb een code → 6-char code | Keuzescherm Studio/Podium; compositie laadt volledig | ⚠️ | Code gevonden → keuzescherm Studio/Podium werkt; maar naam-input op podium blijft leeg (QA-3) |
| L19 | MP3- en video-export | Opslaan & Delen → MP3; bij storyboard ook video | Voortgang zichtbaar, download start; fouten netjes gemeld | ⚠️ | MP3: voortgang 30% → afgerond, download getriggerd ✅; video-export vergt storyboard-compositie → Q3/hertest |
| L20 | Deel-link (8-char) | Opslaan & Delen → deel-link maken → link openen | SharedPlayer met gesture-gate; compositie speelt af | ✅ | Code QA669DP4; publieke player met gesture-gate, pseudoniem "Dansende Bel", read-only tijdlijn speelt |
| L21 | Klascode → 4 opdrachttypen | 4-cijferige code invoeren (template/praatplaat/storyboard/vrij) | AssignmentLanding toont opdrachtkaart; "Starten" routeert per type correct | ⚠️ | Template-flow end-to-end: landing → starten → studio (klas-badge, gelockte clips) → inleveren; wel verkeerde default-opdrachtkaart-tekst (QA-7) |
| L22 | Klascode zonder actieve opdracht (Route C) | Code van klas zonder opdracht | Nette landing met "Vrij componeren" / "Andere code" | ⏳ | Vergt klas zonder opdracht → Q3 |
| L23 | Praatplaat: plek kiezen + inleveren + nieuwe plek | Praatplaat-flow → plek → componeren → inleveren | Positie bewaard; succes-modal; "Kies een nieuwe plek"-knop verschijnt | ⚠️ | Plek kiezen + "Ga verder" + studio-zoom ✅; inzending zelf deelt het (groene) template-submit-pad — spot op viewer + nieuwe-plek-knop → hertest |
| L24 | Peer review | Na inleveren → "Luister naar klasgenoten" | ≤3 anonieme composities, sterren per criterium; venster/cap eerlijk gemeld | ⏳ | Vergt klas + peer-instellingen → Q3 |
| L25 | Feedback-thuis | Met bewaarcode van beoordeelde compositie terugkomen | "Je hebt een reactie!"-melding op start; feedbackblok op podium | ✅ | "Je hebt een reactie!"-banner → podium met sticker, tekst en code-badge CZSPW9 |
| L26 | Composities hervatten | Mijn composities → kaart openen | Compositie laadt in studio; verwijderen met bevestiging | ✅ | Kaart in Mijn Composities → laadt terug in studio incl. bibliotheek |
| L27 | Tutorial + video's | Hoe werkt het? → video starten | Animatie + stappen; YouTube-embed speelt (playsinline) | ✅ | Tutorial + video geverifieerd (iframe met playsinline, zie ook V1) |
| L28 | 8-char-keten overige codes | Template-code, pp-share-code, album-code invoeren | Elke soort routeert naar de juiste viewer; onbekende code → "niet gevonden" | ⚠️ | Onbekende 8-char → nette "Code niet gevonden" ✅; echte template/pp-share/album-codes → Q3 |
| L29 | Mobiel (375px) kernflow | L2+L6+L8+L16 op mobiel formaat | Alles bedienbaar; touch-targets ruim; geen horizontale scroll | ✅ | 375px: start, wizard, studio bedienbaar; transport 44×44, werkbalk 44px effectief (V2-metingen) |
| L30 | EN-doorloop leerling | Taal → EN → L2/L6/L16 kort herhalen | Alle teksten Engels, geen NL-restjes of lege keys | ✅ | EN: start, wizard, kiezers volledig Engels; geen NL-restjes gezien |

## Perspectief DOCENT

| ID | Usecase | Stappen | Verwacht | Status | Bevinding |
|---|---|---|---|---|---|
| D1 | Teacher-landing | /teacher openen, beide tabs, video's, thema-links | Alles rendert; leskaart-blok met 4 kaarten + "Bekijk de leskaart"-links | ✅ | Eerder deze sessie geverifieerd (E2): landing rendert, tabs, leskaart-blok, taal-switcher werkt |
| D2 | Statische leskaart-pagina's | /les/robotfabriek e.a. → CTA "Open voor je klas" | Pagina volledig; CTA → login → dashboard op juiste leskaart | ⚠️ | /les/-pagina's eerder volledig geverifieerd (R4); CTA-hop door login niet expliciet herhaald |
| D3 | Login + foutpaden | Verkeerd wachtwoord, dan goed inloggen | Nette foutmelding; daarna dashboard | ⚠️ | Login gelukt (Berts sessie); foutpad met verkeerd wachtwoord niet getest (zou uitloggen vergen) |
| D4 | Registratie + wachtwoord-vergeten (UI) | Schermen openen, validatie checken | Velden valideren; reset-mail-flow alleen UI-check (echte mail = aparte test) | ⏳ | UI-schermen niet doorlopen in deze ronde (reset-flow al in week 1/testronde 1 getest) |
| D5 | Dashboard-tabs + deeplink | 3 tabs; ?screen=teacher&lesson=drumbeat | Tabs wisselen; deeplink opent Leskaarten-tab op die kaart (ook door login-hop) | ✅ | 3 tabs wisselen; Statistieken/Handleiding/Uitloggen/NL-EN in header |
| D6 | Klas aanmaken + klascode | Mijn klassen → QA-klas aanmaken | Klas met 4-cijferige code; zichtbaar op kaart | ✅ | QA-testklas aangemaakt, klascode 7107 direct zichtbaar; klas #15 lukte — "max 8"-limiet bestaat niet (QA-6) |
| D7 | Startkeuze in klaslokaal | QA-klas → "Gebruik een leskaart" / "Stel zelf samen" | Beide ingangen openen de juiste picker | ✅ | Beide startkeuze-kaarten aanwezig op lege staat én bij wijzig-blok |
| D8 | Opdracht activeren — template | Zelf samenstellen → template kiezen | Actieve opdrachtkaart in klaslokaal; leerling-kant toont hem (L21) | ✅ | Via leskaart Drum beat (systeem-template): actieve kaart + leerling-flow end-to-end (studio met gelockte template-clips) |
| D9 | Opdracht activeren — praatplaat (catalogus) | Type praatplaat → catalogusbeeld kiezen | Instance per (klas+beeld); heractiveren hergebruikt hem | ✅ | Catalogus (13+ beelden incl. thema-locaties) → De Speeltuin geactiveerd; succes-banner met klascode |
| D10 | Opdracht activeren — storyboard + vrij | Beide typen activeren | Correcte kaarten; wisselen vraagt om bevestiging | ⚠️ | Vervang-bevestiging werkt ("Opdracht vervangen?"); storyboard/vrij activeren niet apart herhaald (eerder in M-ronde getest) |
| D11 | Leskaart activeren via picker | Leskaarten-tab → kaart → activeren op QA-klas | One-click; klascode groot in succes; vervang-waarschuwing bij actieve opdracht | ✅ | One-click activeren vanuit picker; kaart direct actief in klaslokaal |
| D12 | Leskaarten-filters + seizoen | Thema/niveau-chips; buiten-seizoen kaart activeren | Filters werken; badge + zachte bevestiging (nooit blokkeren) | ⚠️ | Thema/niveau-chips filteren correct (Winterspelen → alleen winterkaarten); seizoensbadge onbewezen omdat geen thema een venster heeft (QA-4) |
| D13 | Eigen leskaart authoren | Nieuwe leskaart (type → resource → opdrachtkaart → presentatie) | Kaart verschijnt bij eigen leskaarten; bewerken + verwijderen werkt | ⏳ | Authoring niet herhaald in deze ronde — gedekt door hertest-lijst Opdrachten-model (M-ronde) |
| D14 | Opdrachtkaart maken + koppelen | Mijn materiaal → opdrachtkaart → aan opdracht koppelen | Leerling ziet de kaart op de assignment-landing | ⏳ | Idem — hertest-lijst Opdrachten-model |
| D15 | "Bewaar als opdracht" + "maak er een leskaart van" | Podium (als docent) → template opslaan → leskaart ervan maken | Template-code; prefilled leskaart-editor; kaart in Leskaarten-tab | ⏳ | Idem — hertest-lijst Opdrachten-model (M4) |
| D16 | Inzendingen + In bewerking | Leerling levert in (L21) → klaslokaal bekijken | Inzending in juiste tab; WIP-badge voor niet-ingeleverd werk | ✅ | QA-druminzending zichtbaar met Nieuw-badge, pseudoniem, opdracht-tag |
| D17 | Feedback geven | Inzending openen → sticker + sterren + tekst | Opgeslagen; status-dot; leerling ziet het via bewaarcode (L25) | ✅ | Sticker + 3 sterren + tekst → "Verstuurd"; leerling ziet alles terug (L25 ✅: banner + feedbackblok + code-badge) |
| D18 | Peer-instellingen + overzicht | Peer-review aanzetten (feedbackkaart, venster) → overzicht | Leerling-kant kan reviewen (L24); overzicht + top 3 kloppen | ⏳ | Peer-instellingenblok zichtbaar; volledige peer-lus vergt ≥2 leerlingen → hertest in echte klas |
| D19 | Presentatie op digibord | Presenteren → zijpaneel, fullscreen, montagelijn, doorspelen | PresentationSurface volledig; auto-advance; Escape-gedrag correct | ✅ | PresentationSurface opent: "Nu te horen"-pill, fullscreen-knop, transport, feedbackrij |
| D20 | Praatplaat-viewer + delen | Actieve praatplaat → bekijken → spots klikken → delen | Spots spelen composities; share-code + publieke viewer werkt | ⚠️ | Viewer opent met nette lege staat; beeld blijft in lege staat klein (QA-9); met spots eerder in M5 geverifieerd |
| D21 | Album delen | Actieve opdracht → "Deel album" → link openen (incognito) | Code + QR; publiek album speelt alle ingeleverde composities (vergt migratie 031) | ✅ | Migratie 031 gedraaid: code V56MS34H + QR; publieke album-link speelt de inzending af (gesture-gate → PresentationSurface) |
| D22 | Historie | Eerdere opdrachten: heractiveren / bekijken / verwijderen | Alle drie de acties werken; verwijderen waarschuwt bij inzendingen | ✅ | Historie toont Drum beat met "Deel album" + "Activeer" na opdracht-wissel |
| D23 | Statistieken-paneel | Header → Statistieken (admin-account) | Grafiek + tabel laden; niet-admin ziet de knop niet | ✅ | Paneel laadt echte data (26 sessies vandaag / 270 in 30 dgn); knop alleen zichtbaar op admin-account |
| D24 | Docentengids | Gids openen, secties, video's | Structuur + ingebedde video's werken | ⏳ | Niet doorlopen in deze ronde (gids eerder getest; video-embeds gedekt door V1-fix) |
| D25 | Klas verwijderen + max 8 | QA-klas verwijderen; limiet-check | Bevestigingsmodal; teller klopt; testdata opgeruimd | ✅ | Waarschuwingsmodal ("Alle composities worden ook verwijderd!") → QA-klas + testdata opgeruimd |
| D26 | EN-doorloop docent | Dashboard-header → EN → D5/D7/D11 kort herhalen | Alle dashboard-teksten Engels, incl. foutmeldingen (errors.*) | ✅ | Dashboard volledig Engels (Statistics/My classes/Lesson cards); terug naar NL gezet |

---

## Uitvoeringsnotities

- Audio vergt een klik-gesture in de browser; exports en downloads worden geverifieerd op UI-status + console/netwerk (geen bestandsinspectie).
- Echte-apparaat-checks (iPad-video, downloadbestanden openen) blijven bij Bert; hier gemarkeerd als ⚠️ met wat wél is geverifieerd.
