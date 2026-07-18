# Toekomst-masterplan: groepjes & samenwerken (17-7-2026)

> **Status: toekomstige implementatie** — bewust buiten de leerling-codes-v1 gehouden (besluit Bert: "dit vraagt meer dan alleen even leerlingen koppelen"). Dit document is het volledige denkkader zodat we bij oppakken meteen weten wat het idee is. Bouwt voort op [ONTWERP-LEERLING-CODES.md](ONTWERP-LEERLING-CODES.md) (vereist).

---

## 1. Wat willen we (Berts schets)

Een docent wil soms niet 25 individuen maar **groepjes**: "maak 5 groepjes in deze klas". Bij een groepsopdracht geldt: **er is één officiële inzending per groepje** — maar élk lid moet eraan kunnen werken en hem kunnen inleveren. Het systeem moet dus onthouden dat het een groepsopdracht is en de *groeps*-inzending als de waarheid zien, niet wat een individueel kind toevallig instuurt. En de spannendste vraag: kunnen kinderen op verschillende devices **in dezelfde compositie** werken — en zien ze dat dan van elkaar?

## 2. Waarom dit een eigen masterplan is

Drie lagen die elk groter zijn dan ze lijken:
1. **Groepjes-administratie** (behapbaar): wie zit bij wie.
2. **Gedeeld eigenaarschap van één compositie** (middelgroot): meerdere kinderen mogen hetzelfde werk openen, bewerken en inleveren — dat raakt het hele opslagmodel (nu: één compositie = één eigenaar/bewaarcode).
3. **Realtime samen componeren** (groot): live meewerken op meerdere devices raakt de audio-engine, de tijdlijn-state en vergt conflictoplossing — een fundamenteel andere app-modus.

De lagen zijn los te bouwen; de fasering hieronder volgt ze precies.

## 3. Fase F1 — Groepjes-indeling (administratie)

- Nieuwe tabel `class_groups` (id, class_id, name); `class_members.group_id NULL → class_groups`.
- Docent-UI in het Leerlingen-blok: groepjes maken (naam), leden aanvinken/slepen; een kind zit in hooguit één groepje tegelijk.
- Belangrijk besluit uit de brainstorm: **elk kind houdt zijn eigen leerling-code** — geen gedeelde "groepscode". Werk blijft individueel herleidbaar; het groepje is een koppeling, geen identiteit.
- Print-uitbreiding: kaartjes gegroepeerd per groepje.
- Zichtbaar effect zonder verdere bouw: het presentatiescherm en overzichten kunnen per groepje tonen/filteren.

## 4. Fase F2 — De groeps-inzending (zonder realtime)

Het model dat Bert schetste, concreet:
- Bij een **groepsopdracht** (vlag op de class_assignment) bestaat er per groepje precies **één werk-in-uitvoering**: de *groepscompositie* (een submission met `group_id` i.p.v. `member_id`).
- **Elk lid kan hem openen**: log in met je eigen code → je ziet "Jullie compositie (Groepje 3)" → je werkt in hetzelfde opgeslagen werk. Opslaan = de groepsversie bijwerken; inleveren = de groepsversie inleveren. Afzender = groepsnaam + de pseudoniemen van de leden.
- **Versiegedrag ("laatste wint" met vangnet)**: er is geen gelijktijdigheid — als kind B opent terwijl kind A vanmorgen werkte, krijgt B gewoon de laatste versie. Werken twee kinderen per ongeluk tegelijk (twee devices), dan wint de laatste die opslaat; het vangnet is een automatische versiegeschiedenis (laatste 5 snapshots) zodat de docent kan terugzetten. Dit is eerlijk, uitlegbaar en vergt geen realtime-techniek.
- UI-signaal: bij het openen toont de app "Laatst bewerkt: vandaag 10:12 door Fladderende Pinguïn" — zodat kinderen snappen dat ze een gedeeld werk vasthebben.
- Peer-feedback en presentatie behandelen het groepje als één inzender.

## 5. Fase F3 — Realtime samen componeren (verkenning, eerlijk verhaal)

Wat er echt nodig is om twee kinderen tegelijk hoorbaar/zichtbaar in één tijdlijn te laten werken:
- **Transport**: Supabase Realtime (channels) voor clip-mutaties; elke wijziging als event (add/move/trim/delete clip), niet als hele-staat-sync.
- **Conflictmodel**: clips zijn het natuurlijke granulariteitsniveau — "wie een clip vastpakt, bezit hem even" (soft lock met kleur van de ander) voorkomt 95% van de conflicten zonder CRDT-complexiteit. Botsende plaatsingen lossen we op met de bestaande smart-snap ("schuif op naar de eerstvolgende vrije plek").
- **Wat zie je van elkaar**: gekleurde cursors/geselecteerde clips per lid (pseudoniem-label), en een "wie is er nu"-strook. Audio speelt lokaal per device (géén gesynchroniseerde afspeelklok in v1 — dat is een eigen onderzoeksproject).
- **Risico's**: offline/flaky wifi in klaslokalen (event-buffering nodig), audio-engine-reschedule bij elke remote mutatie (bestaat al: `rescheduleWhilePlaying`), en didactisch: 4 kinderen in één tijdlijn zonder afspraken wordt chaos — de werkvorm heeft rollen nodig (bv. per kind één spoor). Dat laatste is meteen het ontwerp-antwoord: **realtime = ieder zijn eigen spoor** in dezelfde compositie; dan verdwijnen ook de meeste conflicten.
- Omvang: eigen masterplan van meerdere weken; pas zinnig als F1+F2 in de praktijk gebruikt worden.

## 6. Afhankelijkheden & volgorde
1. Leerling-codes v1 (R3) → 2. F1 groepjes → 3. F2 groeps-inzending → 4. (optioneel, apart besluit) F3 realtime.
"Samen één verhaal" ([eigen document](ONTWERP-SAMEN-EEN-VERHAAL.md)) heeft aan F1 genoeg en kan vóór F2.

## 7. Open vragen voor het oppak-moment
1. Mag een kind in meerdere groepjes zitten over verschillende opdrachten heen (groepjes per opdracht vs. per klas)?
2. F2: mag elk lid inleveren, of alleen "afronden" markeren waarna de docent het als ingeleverd ziet?
3. Versiegeschiedenis: hoeveel snapshots, en ziet de docent of ook het groepje ze?
4. F3: is "ieder zijn eigen spoor" acceptabel als harde regel, of moet vrij samenwerken kunnen?
