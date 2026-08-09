# Muziek voor thema Piraten — Suno-werkdocument

Alles instrumentaal. Alle loops moeten **onderling mixbaar** zijn: een leerling kan de
kroegmuziek en de jungletrommels tegelijk op de tijdlijn zetten en dat moet kloppen.

---

## Het contract (geldt voor élke loop van dit thema)

| | |
|---|---|
| **Tempo** | **120 BPM**, 4/4 — ligt vast in de app (`DEFAULT_BPM`), niet onderhandelbaar |
| **Looplengte** | 4 maten = **exact 8,000 seconden** |
| **Toonsoort** | **F klein** ← *vastgesteld op het echte materiaal, zie hieronder* |
| **Akkoorden** | **Fm ‖ Fm ‖ Cm ‖ Cm** — twee maten per akkoord (i – v) |
| **Basisgroove** | **half-time reggae**: laid-back, tel 1 leeg, skank op de offbeats |
| **Bezetting per loop** | **één instrumentrol**, sparse — nooit een volledig arrangement |
| **Altijd** | instrumentaal · geen zang · geen fade in/uit · naadloos loopbaar |

### Waarom 120 BPM voor álles werkt

Je wilde één tempo waarop zowel de loome reggae-feel als later een uptempo-gevoel past. Dat
kan, omdat *feel* en *tempo* twee verschillende dingen zijn. Op hetzelfde 120-raster:

| Feel | Klinkt als | Genre |
|---|---|---|
| **half-time** | ~60 BPM, loom en zwoel | reggae, dub — **de basis die we nu maken** |
| straight | 120 BPM, verend | calypso, ska |
| double-time | ~240 BPM, druk en opgewonden | soca, snelle ska |

Alle drie delen dezelfde maatstreep, dus ze stapelen probleemloos. Je kunt dus later
double-time loops maken die naadloos over deze basis passen.

### De toonsoort is vastgesteld op het materiaal, niet op de theorie

**Bert heeft de gegenereerde basisgroove nagespeeld: Suno gebruikt constant
`| Fm | Fm | Cm | Cm |`.** Dat is het schema waar alles zich vanaf nu naar voegt — niet het
schema dat wij vooraf bedachten. Muzikaal is het een **i – v modale vamp in F klein**: twee
maten tonica, twee maten mineur-dominant. Rustig, hypnotiserend en makkelijk om overheen te
spelen, precies wat je wilt als kinderen er lagen bij gaan stapelen.

Praktisch gevolg: noem in nieuwe prompts **F minor**, en houd partijen **modaal en statisch**.
Vraag niet om akkoordwisselingen — Suno negeert ze toch, en hoe minder harmonische beweging
een partij heeft, hoe kleiner de kans dat hij tegen de Fm/Cm-vamp in botst.

> Het onderstaande stuk over Dm–C–B♭–F is de theoretische onderbouwing van waaróm een
> Aeolische vamp goed werkt. Het blijft leerzaam, maar **Fm/Cm is wat er echt klinkt**.

### Waarom een Aeolische vamp werkt (achtergrond: Dm – C – B♭ – F)

Dit is **i – ♭VII – ♭VI – ♭III** in natuurlijk mineur: precies de wending waar het
Monkey Island-hoofdthema op drijft (daar in E klein: Em–D–C–G). Melancholisch én zonnig
tegelijk — dat is de hele truc van die muziek.

> **Let op, dit is een correctie.** Onze spec noemde eerder Dm–C–B♭–**A**. Dat is de
> Andalusische cadens en die klinkt **Spaans/flamenco**, niet Caribisch. Eén akkoord
> verschil, maar het is het akkoord dat de sfeer bepaalt. Gebruik **F**, niet A.

---

## Wat de Monkey Island-muziek eigenlijk ís

Kort, zodat je in Suno kunt bijsturen op gehoor.

**Genre**: "upbeat calypso reggae" met klassieke elementen. Componist Michael Land wilde
muziek die je opvrolijkt "als vrolijke syncopische muziek uit een radio".

**Het klankpalet.** Het origineel (1990) is geschreven voor de Roland MT-32 en gebruikt
**panfluit, xylofoon, elektrisch orgel, marimba, akoestische bas, een dromerige pad,
"bottle blow" en congas**. Voor *Curse of Monkey Island* (1997) haalde Land live spelers
binnen: **steeldrums, marimba**, drums, percussie, gitaar, fluiten, hobo, engelse hoorn,
fagot, klarinet — hij speelde zelf de bas. Dat zijn de instrumentnamen die je in Suno noemt.

**Het ritme.** Twee dingen maken het herkenbaar:
- de **skank** — korte, gedempte akkoordaanslagen op de **offbeats** (de "en" tussen de tellen)
- de **one-drop** — **tel 1 blijft leeg**, kick en snare vallen samen op tel 3

Die lege tel 1 is muzikaal goud voor ons: dáár kan een leerling zijn eigen sample neerleggen
zonder dat het botst.

**De bas draagt de melodie.** In reggae is de bas geen begeleiding maar de hoofdrolspeler:
melodisch, rond, met veel ruimte tussen de noten.

---

## Werkwijze in Suno

1. Zet **Instrumental** aan (harde eis — geen zang).
2. Plak een van de prompts hieronder in het **Style**-veld.
3. Genereer 2 varianten, luister, kies.
4. Download als mp3/wav en lever aan; ik knip 'm naar exact 8,000 s en normaliseer.

**Promptregels die in de praktijk werken**
- **Genre eerst, sfeer tweede, instrumenten derde** — die volgorde weegt het zwaarst.
- Schrijf het tempo **als getal**: `120 BPM`, niet "rustig tempo".
- Zet er `seamless loop` en `no fade in or out` bij.
- **Sparse houden.** Vraag je een compleet nummer, dan krijg je een muur waar niets meer
  bij past. Eén instrumentrol per loop.
- Eén of twee **negatieve tags** scherpen de prompt; meer verzwakt 'm.
- **Noem de game of de componist niet.** Suno levert daar slechtere resultaten op, en het
  is onnodig — de stijl beschrijven werkt beter.

---

## De prompts

Elke prompt is één instrumentrol. Ze zijn zo geschreven dat ze **over elkaar heen passen**.
Begin met #1 en #2: die twee samen zijn al een complete groove en bewijzen meteen of het
contract klopt.

### 1. Fundament — bas + one-drop drums

```
Half-time reggae groove, laid-back and warm, 120 BPM with a slow half-time feel.
Melodic round electric bass carrying the tune, one-drop drums with beat one left empty
and kick plus rim-shot snare landing together on beat three, light hi-hat.
Key of D minor, chords Dm - C - Bb - F, one bar each, repeating.
Sparse arrangement, lots of space, dry and close-miked. Seamless loop, no fade in or out.
Instrumental only.
Avoid: no vocals, no melody instruments, no synth pads.
```

### 2. Skank — de offbeat-akkoorden

```
Half-time reggae skank, warm and mellow, 120 BPM with a slow half-time feel.
Short muted guitar and vintage electric organ chords played only on the offbeats,
staccato, nothing on the downbeats.
Key of D minor, chords Dm - C - Bb - F, one bar each, repeating.
Very sparse, no bass, no drums, plenty of silence between the chops.
Seamless loop, no fade in or out. Instrumental only.
Avoid: no vocals, no drums.
```

### 3. Melodie — marimba en steeldrum

```
Caribbean island melody, bittersweet and playful, 120 BPM with a relaxed half-time feel.
Solo marimba with soft steel drum doubling, gentle syncopated phrases with plenty of rests.
Key of D minor natural minor, over the chords Dm - C - Bb - F, one bar each, repeating.
Sparse and unaccompanied, warm acoustic recording. Seamless loop, no fade in or out.
Instrumental only.
Avoid: no vocals, no drums, no bass.
```

### 4. Sfeer — panfluit en dromerige pad

```
Dreamy tropical atmosphere, mysterious and warm, 120 BPM with a slow half-time feel.
Breathy pan flute playing long sustained notes over a soft vintage synth pad,
distant and airy, very few notes.
Key of D minor, following the chords Dm - C - Bb - F, one bar each, repeating.
Extremely sparse, ambient, sits in the background. Seamless loop, no fade in or out.
Instrumental only.
Avoid: no vocals, no drums, no percussion.
```

### 5. Percussie — congas en shaker (toon-neutraal)

```
Caribbean hand percussion groove, loose and organic, 120 BPM with a half-time feel.
Congas, bongos, shaker and woodblock playing a syncopated pattern, leaving beat one open.
No pitched instruments at all.
Dry close-miked acoustic percussion, sparse, plenty of space. Seamless loop,
no fade in or out. Instrumental only.
Avoid: no vocals, no melody, no bass.
```

> Deze is **toon-neutraal**: hij past onder elke andere loop, ook als je later in een andere
> toonsoort werkt.

### 6. Donkere variant — voor de voodoo-hut

```
Dark tropical dub, eerie and slow, 120 BPM with a heavy half-time feel.
Low bass clarinet and bassoon playing a slippery chromatic line, sparse muted marimba hits,
deep tom accents, tape delay.
Key of D minor, chords Dm - C - Bb - F, one bar each, repeating.
Sparse and menacing but not scary, suitable for children. Seamless loop, no fade in or out.
Instrumental only.
Avoid: no vocals, no bright melodies.
```

> De schurk in Monkey Island heeft een "chromatisch glibberig" motief in lage blazers —
> dat idee zit in deze prompt, zonder eng te worden voor kinderen.

---

---

## Losse stemmen bovenop de basisgroove

> **Praktijkbevinding (Bert, 2026-08-02): Suno houdt zich niet aan een akkoordenschema.**
> `Dm - C - Bb - F` in de prompt zetten werkt niet. Wat wél werkt:
>
> 1. **Upload de basisgroove** en laat Suno er een laag overheen maken (Cover / Remix /
>    audio-upload, v5+). De nieuwe partij volgt dan je bestaande harmonie **op gehoor**.
>    Dit is de betrouwbaarste route voor alles met toonhoogte.
> 2. Lukt dat niet: noem alleen de **toonsoort** (D minor) en vraag om een **modale, statische**
>    partij rond één tooncentrum — geen akkoordwisselingen. Hoe minder harmonische beweging,
>    hoe kleiner de kans op botsing.
> 3. **Toon-neutrale partijen** (percussie, bassdrum) passen altijd — die kun je zorgeloos los
>    genereren.

### 7. Tinfluit / panfluit solo — kroeg

```
Solo tin whistle and pan flute, wistful and breathy, 120 BPM with a laid-back half-time feel.
One unaccompanied melody line in D minor, modal and static around one tonal centre,
simple syncopated phrases with long rests between them.
Completely solo, no accompaniment of any kind. Dry close-miked recording.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, bass, guitar, chords
```

### 8. Accordeon — kroeg

```
Solo tavern accordion, warm and slightly wheezy, 120 BPM with a laid-back half-time feel.
Bellows-driven chords played on the offbeats plus a simple folk melody, in D minor,
modal and static, sitting in one register.
Completely solo, no accompaniment. Slightly worn, close and intimate.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, bass, brass
```

### 9. Conga's — jungle *(toon-neutraal, past altijd)*

```
Solo congas and bongos, organic and loose, 120 BPM with a half-time feel.
Syncopated hand-drum pattern leaving beat one open, alternating open tones and muted slaps,
varied dynamics like a live player.
Hand percussion only, nothing else at all. Dry close-miked, warm skin tone.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, melody, bass, cymbals, drum kit
```

### 10. Bassdrum — kroeg *(toon-neutraal, past altijd)*

```
Solo deep bass drum, heavy and soft-mallet, 120 BPM with a slow half-time feel.
One-drop pattern: beat one left completely empty, a single deep hit landing on beat three,
occasional soft ghost note before it. Lots of silence.
Bass drum only, nothing else. Deep, round, dry.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, melody, snare, hi-hat, cymbals, bass guitar
```

### 11. Shanty-koor zonder tekst — schip

Dit is de enige loop **mét** stemmen, dus hier gaan de instellingen anders:

- **Instrumental UIT** (anders krijg je geen stemmen)
- **Style-veld**: de prompt hieronder
- **Lyrics-veld**: alleen klinkers, géén woorden — zo voorkom je dat Suno tekst verzint:

```
[Chorus]
Ooooh ooooh ooooh
Aaaah aaaah
Hooo-ooo hooo-ooo
Ooooh ooooh ooooh
```

Style-veld:

```
Wordless sea shanty choir, a group of rough male voices humming and singing open vowels
in unison and simple harmony, no words at all, 120 BPM with a slow half-time swaying feel.
In D minor, modal and static, long sustained notes, breathing together like a work song.
Warm and distant, recorded in a wooden room. Seamless loop, no fade in or out.
Exclude: lyrics, words, solo lead vocal, drums, guitar
```

> Suno verzint graag alsnog woorden. Klinkt het als taal, genereer opnieuw of houd de
> klinkers in het lyrics-veld nóg simpeler (alleen `Ooooh`).

---

---

## Double-time set (zelfde 120 BPM-raster)

Zelfde tempo, zelfde toonsoort (F klein), maar een **dubbel zo druk gevoel**: zestienden in
plaats van de loome half-time. Sfeer: filmische zeeslag-percussie. Omdat het hetzelfde
raster deelt, stapelt het over de half-time loops.

### 12. Drums — double-time, filmisch *(toon-neutraal, past altijd)*

```
Epic cinematic orchestral percussion, swashbuckling high-seas adventure, heroic and urgent,
120 BPM with a driving double-time feel: relentless sixteenth-note pulse over a steady grid.
Deep taiko drums and orchestral bass drum marking the downbeats, tight military snare
playing driving sixteenths with a short roll leading into each bar, low toms answering,
tambourine and shaker on top.
Percussion only, no pitched instruments whatsoever. Big and punchy but DRY and close-miked,
almost no reverb tail. Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, strings, brass, orchestra, melody, bass guitar, synth, choir
```

**Waarom dit zo geschreven is:**
- **Toon-neutraal**, dus de Fm/Cm-vamp doet er niet toe — deze loop past sowieso.
- **`DRY`, bijna geen galm**: filmische percussie komt standaard in een badkuip vol reverb.
  Die staart maakt (a) de lusnaad hoorbaar en (b) de stapeling modderig zodra er meer lagen
  bij komen. Dit is het belangrijkste woord in de prompt.
- **`Exclude: strings, brass, orchestra`**: vraag je om filmische percussie, dan schuift Suno
  er graag een heel orkest bij. Dan heb je geen stem meer maar een compleet nummer.
- **Snare-roll naar de maatstreep**: geeft de lus een hoorbaar startpunt, zodat een kind hoort
  waar de maat begint.

### 13. Bas — double-time ostinato

De akkoordbeweging is hier als **grondtonen** geschreven (F → C), niet als akkoordschema.
Suno negeert schema's, maar een simpele grondtoonverplaatsing pikt hij vaker wél op.

```
Driving cinematic bass ostinato, dark and relentless, 120 BPM with a double-time feel.
Low cellos and double basses plus a deep electric bass doubling them, playing a repeating
pumping eighth-note ostinato low in their range.
In F minor: staying on a low F for two bars, then moving to C for two bars, repeating.
Bass register only, nothing above it. Dry, tight and punchy, minimal reverb.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, percussion, melody, high strings, brass, synth pads
```

### 14. Strijkers-ostinato — de motor

```
Urgent cinematic string ostinato, heroic and swashbuckling, 120 BPM with a driving
double-time feel: relentless sixteenth notes, spiccato and tightly bowed.
Violins and violas repeating a tight rhythmic figure around one tonal centre in F minor,
modal and static, no chord changes, no long melody.
Mid to high strings only. Dry and close, almost no reverb tail, plenty of bite.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, percussion, brass, bass, choir, synth
```

### 15. Accordeon — double-time folk

```
Fast folk accordion, spirited and rowdy, 120 BPM with an energetic double-time feel,
like a tavern reel gathering speed.
Solo bellows accordion playing quick running eighth and sixteenth-note figures in F minor,
modal and static around one tonal centre, with a bouncing offbeat pulse underneath.
Completely solo, no accompaniment. Close, dry and slightly worn.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, percussion, strings, brass, bass
```

### 16. Lage koperblazers — de heldenstem *(aanrader)*

```
Heroic low brass hook, bold and adventurous, 120 BPM with a broad double-time feel.
French horns and trombones in unison playing a short, strong rising motif in F minor,
just a few long notes with space between them, modal and static.
Low brass only, nothing else at all. Dry and direct, close-miked, minimal hall.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, percussion, strings, high brass, trumpet fanfare, choir
```

### Waarom juist deze vier

Ze bezetten **elk een eigen frequentiegebied**, zodat stapelen helder blijft:

| Stem | Register | Rol |
|---|---|---|
| Bas | laag | stuwing en fundament |
| Koperblazers | laag-midden | de heldenmelodie |
| Accordeon | midden | folkkleur, brug naar de half-time set |
| Strijkers | midden-hoog | de motor, het beweginggevoel |
| Drums (#12) | breedband | het ritme |

Twee dingen staan in élke prompt, en dat is niet toevallig:
- **`modal and static`, geen akkoordwisselingen** — de enige knop die je nog hebt nu Suno
  schema's negeert. Hoe stiller de harmonie, hoe kleiner de kans op botsing met de Fm/Cm-vamp.
- **`dry`, minimale galm** — anders wordt een stapel van vier lagen meteen modderig en hoor
  je de lusnaad.

## Aanleveren en verwerken

Lever de gedownloade bestanden aan (pad of in de map
`.thema-studio/piraten/kandidaten/audio-suno/`), dan doe ik:

1. **Een schone lus van 4 maten zoeken** in het gegenereerde nummer.
2. **Tempo controleren.** Meet die lus *T* seconden, dan is het werkelijke tempo `960 / T`.
   Bij exact 120 BPM is *T* = 8,000 s. Wijkt Suno af, dan rek ik met behoud van toonhoogte
   naar exact 8,000 s (`verwerk-geluid.py --naar-tempo T`).
3. **Normaliseren + micro-fades** zodat alle loops even hard klinken en niet klikken.
4. **Controleren** met `check-audio.py` (mp3, exact 8,0 s, 50-200 KB).

**De echte toets doe jij**: twee loops over elkaar in de studio. Klinkt de stapeling strak
op de maat en botsen de akkoorden niet, dan klopt het contract. Ik kan geen audio horen, dus
dat oordeel is van jou.

## Waar dit later heen kan

- **Double-time varianten** op hetzelfde raster (soca/ska-feel) — mixen met deze basis.
- **Losse instrumentsamples** die bij de muziek passen: een accordeonakkoord, een
  trommelbreak — in dezelfde toonsoort, zodat leerlingen ze los kunnen inzetten.
- **Per locatie een eigen rol**: kroeg = skank · haven = sfeer · schip = fundament ·
  jungle = percussie · voodoo-hut = donkere variant. Alles samen = de themamix.
