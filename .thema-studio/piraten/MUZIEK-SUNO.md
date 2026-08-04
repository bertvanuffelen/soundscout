# Muziek voor thema Piraten — Suno-werkdocument

Alles instrumentaal. Alle loops moeten **onderling mixbaar** zijn: een leerling kan de
kroegmuziek en de jungletrommels tegelijk op de tijdlijn zetten en dat moet kloppen.

---

## Het contract (geldt voor élke loop van dit thema)

| | |
|---|---|
| **Tempo** | **120 BPM**, 4/4 — ligt vast in de app (`DEFAULT_BPM`), niet onderhandelbaar |
| **Looplengte** | 4 maten = **exact 8,000 seconden** |
| **Toonsoort** | **D klein (natuurlijk mineur / Aeolisch)** |
| **Akkoorden** | **Dm ‖ C ‖ B♭ ‖ F** — één maat per akkoord, dan terug naar Dm |
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

### Waarom Dm – C – B♭ – F

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
