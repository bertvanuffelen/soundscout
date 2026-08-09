# Themaplan: Piraten (`piraten`)

> Status: ☐ concept · **wacht op goedkeuring Bert** (fase B-gate)
> Sfeer: Monkey Island — warme tropen, humor, grog, schatten · Personages: **alles robots**
> Model finale beelden: `nano_banana_pro` (Higgsfield CLI, 2 credits/beeld)
> Begroting: 11 finale beelden × ~2,5 pogingen ≈ ~28 generaties ≈ **~56 credits** (van 150)

## 1. Concept

- **Wereld**: een tropisch robot-piratenrijk in Monkey Island-sfeer.
- **Doelgroep**: groep 3-8 · **Drukte**: medium (praatplaat ~25 acties; locaties rustiger).
- **Personages**: uitsluitend robots (robot-piraten, robot-papegaai, robot-apen, robot-krab),
  met piraten-flavor: roest, zeewier, houten-been-bouten, ooglap-panelen, driekante hoed.
- **Naam NL/EN**: "Piraten" / "Pirates" · **Beschrijving NL/EN**: "Grogkroeg, haven, schip,
  jungle en voodoo — vaar mee!" / "Tavern, harbor, ship, jungle and voodoo — set sail!"
- **isPublic**: true
- **Kleuren**: primary `#0E8C8C` (tropisch teal) · accent `#E8A02C` (schatgoud) ·
  mapBackground `#F3E1BE` (vergeeld perkament)
- **Belichting**: golden-hour tropen buiten; warme lantaarn-/fakkelgloed binnen
  (grogkroeg, voodoo-hut).
- **Periode & props (age-of-sail)**: alle props/bouwwerken passen bij de piratentijd —
  hout, touw, canvas, katrollen, **houten kraan/derrick**, vaten, kompas, lantaarns. **Géén
  moderne stalen machines/kranen.** Alleen de robots zijn futuristisch. Dieren = mechanische
  robot-dieren.
- **Piraten-gear op de robots**: de meeste robots dragen zichtbaar piraten-accessoires —
  bandana's, ooglap-panelen, driekante hoeden, gouden oorringen, sjerpen, af en toe een
  haakhand. Zet dit expliciet in elke beeldprompt (anders komen ze te "kaal" uit de engine).

## 2. Locaties (5) — elk 6-8 sound-hotspots binnen een vólle wemelscène

**Elke locatieplaat is even druk als een praatplaat: ~25 acties/elementen.** De 6-8
samples hieronder zijn de duidelijk herkenbare **sound-hotspots** (pulserende marker in de
app); daaromheen ~17 extra on-theme klungel-gags (geen eigen sample). De volledige
~25-actielijst per locatie schrijf ik uit vlak vóór generatie; voor de Grogkroeg (anker)
staat 'ie hieronder al (§2.1a).

Legenda type: `L8` = muzikale/atmosfeer-loop exact 8.0s · `sfx` = 2-8s effect.
Route: **F** Freesound · **E** ElevenLabs · **C** checklist. Icon = Lucide (nieuw = moet
in `iconMap.tsx`).

### 2.1 `grogkroeg` — De Dorstige Papegaai *(ANKERBEELD)*
Knusse piratenkroeg, lantaarnlicht, houten balken. Achtergrond toont: een robot aan de
accordeon, klinkende kroezen aan de bar, een robot-papegaai op een balk, een lachende
robot-piraat, een klapdeur, een dobbeltafel, een leeg vat als trommel, een robot met fluit.

| sampleId | NL / EN | geluid | type | icon | kleur | route |
|---|---|---|---|---|---|---|
| grogkroeg-accordeon | Accordeon / Accordion | vrolijk accordeon-deuntje | L8 | Music | #E8A02C | F |
| grogkroeg-kroezen | Proost / Cheers | klinkende grog-kroezen | sfx | Beer* | #FB923C | F |
| grogkroeg-papegaai | Papegaai / Parrot | robot-papegaai krijst | sfx | Bird | #F87171 | E |
| grogkroeg-lach | Lachbui / Laughter | bulderende piratenlach | sfx | Smile | #F472B6 | E |
| grogkroeg-deur | Klapdeur / Door | krakende klapdeur | sfx | DoorOpen* | #A78BFA | F |
| grogkroeg-dobbel | Dobbelstenen / Dice | rammelende dobbelstenen | sfx | Dice5* | #34D399 | F |
| grogkroeg-vat | Vattrommel / Barrel | bonken op een leeg vat | sfx | CircleDot | #60A5FA | F |
| grogkroeg-fluit | Tinfluit / Tin whistle | deuntje op tinnen fluit | sfx | AudioWaveform | #38BDF8 | F |

#### 2.1a Grogkroeg — volledige wemel-actielijst (~25, gem-stijl slapstick)
**Sound-hotspots (8, = de samples):**
1. robot-piraat speelt vals accordeon, vonken uit de balg → `grogkroeg-accordeon`
2. twee robots klinken zó hard hun grog-kroezen dat de olie eruit klotst → `grogkroeg-kroezen`
3. robot-papegaai krijst op een balk, laat een boutje op een kop vallen → `grogkroeg-papegaai`
4. dikke robot-piraat lacht zo hard dat z'n kaakplaat loslaat → `grogkroeg-lach`
5. de klapdeur zwaait open en klapt tegen een binnenkomende robot → `grogkroeg-deur`
6. robot gooit dobbelstenen die in de kroes van z'n buurman ploffen → `grogkroeg-dobbel`
7. robot roffelt op een leeg vat en zit met z'n vuist vast → `grogkroeg-vat`
8. robot speelt tinfluit, er komt stoom uit i.p.v. muziek → `grogkroeg-fluit`

**Achtergrond-gags (~17, on-theme, geen eigen sample):**
9. barman-robot poetst een kroes zó hard dat 'ie versplintert · 10. robot glijdt uit over
een geplette olie-latté · 11. robot hakt een enterhaak in de kroonluchter en trekt 'm los ·
12. chibi-robotje klimt in een wijnrek, flessen wankelen · 13. robot met houten been haakt
achter een tafelpoot · 14. robot dweilt gemorste grog maar smeert het uit · 15. twee robots
armworstelen, de tafel kraakt doormidden · 16. robot-kok gooit een pannenkoek die aan het
plafond plakt · 17. robot telt gouden munten en laat de stapel vallen · 18. robot zet z'n
ooglap-paneel recht en botst tegen een balk · 19. robot-scheepskat jaagt op een mechanisch
muisje · 20. robot valt achterover van z'n kruk · 21. robot opent een fles met z'n
tandenrij, de kurk schiet weg · 22. ober-robot balanceert een kantelend dienblad vol kroezen
· 23. robot steekt een lantaarn aan en schroeit z'n eigen antenne · 24. robot bestudeert een
schatkaart ondersteboven · 25. robot-krab knipt aan een tafelkleed.

**Verborgen zoekdetails**: een klein robotje verstopt in een lege grog-ton · een muntje op
de grond · een mechanisch muisje onder de bar.

### 2.2 `haven` — De Kade
Zonnige haven bij golden hour. Toont: meeuwen, klotsende golven, een scheepsbel, een
knarsende katrol, een laadkraan, gestapelde kisten, een belboei.

| sampleId | NL / EN | geluid | type | icon | kleur | route |
|---|---|---|---|---|---|---|
| haven-meeuwen | Meeuwen / Seagulls | krijsende robot-meeuwen | sfx | Bird | #38BDF8 | F |
| haven-golven | Golven / Waves | klotsende golven tegen de kade | L8 | Waves* | #0E8C8C | F |
| haven-scheepsbel | Scheepsbel / Ship's bell | luidende scheepsbel | sfx | Bell* | #E8A02C | F |
| haven-katrol | Katrol / Pulley | knarsend touw en katrol | sfx | Anchor* | #FB923C | F |
| haven-kraan | Laadkraan / Crane | ratelende laadkraan | sfx | CircleDot | #A78BFA | F |
| haven-kist | Kisten / Crates | bonkende houten kisten | sfx | Package* | #FBBF24 | F |
| haven-boei | Belboei / Buoy | deinende belboei | sfx | Circle | #60A5FA | F |

### 2.3 `schip` — Het Piratenschip (dek)
Dek van een robot-galjoen op zee. Toont: klapperende zeilen, een kanon, een ankerketting,
zingende bemanning bij het stuurwiel, wapperende wind, een kraaiennest met toeter.

| sampleId | NL / EN | geluid | type | icon | kleur | route |
|---|---|---|---|---|---|---|
| schip-zeilen | Zeilen / Sails | klapperende zeilen | sfx | Sailboat* | #38BDF8 | F |
| schip-kanon | Kanon / Cannon | kanonschot boem | sfx | Zap | #F87171 | F |
| schip-anker | Ankerketting / Anchor | rammelende ankerketting | sfx | Anchor* | #A78BFA | F |
| schip-zeemanslied | Zeemanslied / Sea shanty | bemanning zingt een shanty | L8 | Volume2 | #E8A02C | E |
| schip-wind | Wind / Wind | loeiende wind in het want | L8 | Wind* | #60A5FA | F |
| schip-stuurwiel | Stuurwiel / Wheel | knarsend draaiend stuurwiel | sfx | Circle | #FB923C | F |
| schip-kraaiennest | Kraaiennest / Crow's nest | uitkijk roept door een toeter | sfx | Megaphone | #34D399 | E |

### 2.4 `jungle` — Het Junglepad
Weelderig tropisch pad. Toont: robot-apen, tropische vogels, een waterval, verre trommels,
sjirpende krekels, een vallende kokosnoot, een sissende slang.

| sampleId | NL / EN | geluid | type | icon | kleur | route |
|---|---|---|---|---|---|---|
| jungle-apen | Robot-apen / Robot monkeys | kwetterende robot-apen | sfx | Bot | #34D399 | E |
| jungle-vogels | Junglevogels / Jungle birds | fluitende tropische vogels | sfx | Bird | #F472B6 | F |
| jungle-waterval | Waterval / Waterfall | ruisende waterval | L8 | Droplet* | #0E8C8C | F |
| jungle-trommels | Trommels / Drums | verre voodoo-trommels | L8 | Disc3 | #E8A02C | F |
| jungle-krekels | Krekels / Crickets | sjirpende robot-krekels | sfx | Bug* | #34D399 | F |
| jungle-kokosnoot | Kokosnoot / Coconut | bonkende vallende kokosnoot | sfx | Circle | #FB923C | F |
| jungle-slang | Slang / Snake | sissende robot-slang | sfx | AudioWaveform | #A78BFA | E |

### 2.5 `voodoohut` — De Voodoo-hut
Mysterieuze hut vol maskers en flesjes, fakkelgloed. Toont: een borrelende ketel, een
geluksketting van botjes, een gong, een windgong, gefluister, een druppelende grot, een raaf.

| sampleId | NL / EN | geluid | type | icon | kleur | route |
|---|---|---|---|---|---|---|
| voodoohut-ketel | Toverketel / Cauldron | borrelende ketel | L8 | CircleDot | #34D399 | F |
| voodoohut-botten | Botten / Bones | rammelende botjes | sfx | Skull* | #A78BFA | F |
| voodoohut-gong | Gong / Gong | galmende gong | sfx | Disc3 | #E8A02C | F |
| voodoohut-windgong | Windgong / Chimes | tinkelende windgong | sfx | Music | #0E8C8C | F |
| voodoohut-fluister | Gefluister / Whisper | mysterieus gefluister | sfx | Volume2 | #A78BFA | E |
| voodoohut-druppel | Druppel / Drip | druppelende grot | sfx | Droplet* | #60A5FA | F |
| voodoohut-raaf | Raaf / Raven | krassende robot-raaf | sfx | Bird | #7C3AED | E |

**36 samples · 6 loops** (accordeon, golven, zeemanslied, waterval, trommels, ketel).
**Nieuwe iconen voor iconMap.tsx**: Beer, DoorOpen, Dice5, Waves, Bell, Anchor, Package,
Sailboat, Wind, Droplet, Bug, Skull.

## 3. Praatplaat (1): `pp-piratenmarkt`

- **Naam NL/EN**: Piratenmarkt / Pirate market · **category**: fictie · **availableFor**: both
- **Shot**: overzicht/straatscène (hoog standpunt over een druk marktplein in een robot-piratenstadje)
- **Dominante kleur**: schatgoud + teal · medium druk, ~26 acties
- **Activiteiten (elk sonificeerbaar met ≥1 sample; spreiding over alle 5 locaties):**

| # | Activiteit | sample |
|---|---|---|
| 1 | robot-piraat speelt accordeon op een kist | grogkroeg-accordeon |
| 2 | twee robots klinken grog-kroezen | grogkroeg-kroezen |
| 3 | robot-papegaai krijst op een lantaarnpaal | grogkroeg-papegaai |
| 4 | bulderend lachende robot-piraat | grogkroeg-lach |
| 5 | robot gooit dobbelstenen op een ton | grogkroeg-dobbel |
| 6 | robot bonkt ritme op een leeg vat | grogkroeg-vat |
| 7 | robot speelt een deuntje op een tinfluit | grogkroeg-fluit |
| 8 | robot-meeuwen vechten om een visje | haven-meeuwen |
| 9 | golven klotsen tegen de kademuur | haven-golven |
| 10 | havenmeester luidt de scheepsbel | haven-scheepsbel |
| 11 | robot hijst een kist met een knarsende katrol | haven-katrol |
| 12 | laadkraan ratelt vracht omhoog | haven-kraan |
| 13 | robots stapelen bonkende kisten | haven-kist |
| 14 | belboei deint in het water | haven-boei |
| 15 | zeilen klapperen aan een kraam-mast | schip-zeilen |
| 16 | speelgoed-kanon knalt confetti | schip-kanon |
| 17 | robots zingen een zeemanslied rond een ton | schip-zeemanslied |
| 18 | vlaggen wapperen loeiend in de wind | schip-wind |
| 19 | robot roept door een toeter "Verse vis!" | schip-kraaiennest |
| 20 | robot-aapje jat een banaan van een kraam | jungle-apen |
| 21 | tropische robot-vogel fluit in een kooi | jungle-vogels |
| 22 | robot slaat op markt-trommels | jungle-trommels |
| 23 | kokosnoot bonkt van een kraam | jungle-kokosnoot |
| 24 | voodoo-robot roert in een borrelende ketel | voodoohut-ketel |
| 25 | robot rammelt met een geluksketting van botjes | voodoohut-botten |
| 26 | robot slaat op een gong om de markt te openen | voodoohut-gong |

- **Verborgen zoekdetails**: een schatkaart met een X in een kraam · een schatkist die onder
  een kleed gluurt · een verstopte robot-krab · een muntje op de grond · een klein robot-aapje
  op een dak.

## 4. Storyboard (1): `schattenjacht`

- **Naam NL/EN**: De schattenjacht / The treasure hunt
- **Beschrijving NL/EN**: Een robot-piraat volgt de kaart naar de schat. / A robot pirate
  follows the map to the treasure.
- **Held (letterlijk herhalen per frame)**: een vriendelijke koperkleurige robot-piraat met
  zichtbare bouten en naden, een metalen driekante hoed, gloeiende cyaan visor-ogen, een klein
  mechanisch papegaaitje op de schouder, één geklonken houten-been.
- **Frames (4)**:

| frameId | Label NL / EN | handeling | standpunt |
|---|---|---|---|
| kaart | Kaart / Map | bestudeert de schatkaart bij lantaarnlicht op de kade | medium, warm |
| jungle | Jungle / Jungle | hakt zich door het junglepad, apen en vogels om zich heen | totaal |
| graven | Graven / Digging | graaft bij de grote rode X op een tropisch strand | actie, laag |
| schat | Schat / Treasure | de kist gaat glinsterend open, goud straalt eruit | close-up |

- **coverImage**: frame `schat` (glinsterende schat — meest dynamisch)

## 5. Plattegrond = de schatkaart (`piraten/plattegrond.jpg`)

Kaartstijl **(a) landschapskaart** op vergeeld perkament (mapBackground), in de conventie
van de winterspelen-kaart maar dan als schatkaart:
- **Lint-banners** met de zone-namen boven elk eiland (nette leesbare letters).
- **Gestippelde route** die de eilanden verbindt, eindigend bij een **grote rode X**.
- **Kompasroos** rechtsboven met een **robot-schedel als 'N'** (thema-twist).
- **Legenda-kader** linksonder: 〰️ Route · 🏝️ Eilanden · ⚓ Schip · ✖️ De schat.
- Sfeer-vignetten: golfjes met een zeemonster-slinger, een klein zeilschip, palmbomen.
**7 eiland/zone-vignetten**, elk met een banner-label (NL):

**Actief nu (5, krijgen een map-marker):**
| locationId | zone-label | x | y | size |
|---|---|---|---|---|
| grogkroeg | DE DORSTIGE PAPEGAAI | 22 | 74 | md |
| haven | DE KADE | 46 | 82 | md |
| schip | HET SCHIP | 70 | 40 | lg |
| jungle | HET JUNGLEPAD | 30 | 34 | md |
| voodoohut | DE VOODOO-HUT | 80 | 74 | md |

**Toekomst (2, wél getekend als eiland-vignet, géén marker — kaart hoeft later niet opnieuw):**
- SCHEEPSWRAK-BAAI (scheepswrak in een baai) — rond x 58, y 16
- SCHEDELROTS (rots in de vorm van een schedel) — rond x 12, y 20

## 6. Beeldproductie-lijst (11 finale beelden)

| beeld-id | type | doelpad in package/ | status |
|---|---|---|---|
| grogkroeg | locatie *(anker)* | public/images/themes/piraten/grogkroeg.jpg | ☐ |
| haven | locatie | public/images/themes/piraten/haven.jpg | ☐ |
| schip | locatie | public/images/themes/piraten/schip.jpg | ☐ |
| jungle | locatie | public/images/themes/piraten/jungle.jpg | ☐ |
| voodoohut | locatie | public/images/themes/piraten/voodoohut.jpg | ☐ |
| plattegrond | schatkaart | public/images/themes/piraten/plattegrond.jpg | ☐ |
| pp-piratenmarkt | praatplaat | public/images/praatplaten/piratenmarkt.jpg | ☐ |
| sb-kaart / sb-jungle / sb-graven / sb-schat | storyboard | public/images/storyboards/schattenjacht/schattenjacht-{1..4}.jpg | ☐ |

## 7. Prompts

Elke prompt krijgt het **robot-standaardblok** uit `reference/stijl-robots.md` +
"Wide horizontal illustration" + de negatieve prompt (geen tekst/mensen/echte dieren/
letterbox; plattegrond = uitzondering voor labels). Volledige prompts schrijf ik per beeld
vlak vóór generatie in `prompts/`. Het **ankerbeeld** (grogkroeg) gaat als eerste, zonder
anker; na jouw goedkeuring wordt het de stijlreferentie voor alle volgende beelden.
