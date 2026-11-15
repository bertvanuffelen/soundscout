# SoundScout V2 — Theme Pipeline Blueprint: Sinterklaas

Status: **APPROVED AND LOCKED — Bert, 15-11-2026.** All decisions are final (§6). Changes from here on only by Bert's explicit decision, logged in §6. Nothing in this document has been generated, downloaded or paid for.
Sources: the three skills in `.claude/skills/` (thema-studio, afbeeldingen-generator, geluiden-verzamelen), `v2-architecture-proposal.md` (Locked decisions, §3, §6.1, §6.3), and the existing themes `basis`, `winterspelen`, `piraten`.

Two facts frame everything below.

1. **This is the 2026 interim release (decided).** It is built through the current TypeScript path (§4.4) and goes live in November 2026. Today is 15 November and pakjesavond is 5 December, so the working target is **live by 26 November**, which leaves about ten days of production. §5 has the compressed schedule.
2. **The `.sspack` format is a proposal, not software.** §4 keeps the target layout so that this release can be converted to a pack in Phase 3 without regenerating anything, provided every master file is kept.

**Ready to start now:** the anchor image and the Sint portrait prompts are in §2.7; the five Suno prompts are in §3.5.

---

## 1. Theme plan

### 1.1 Concept

| Field | Value |
|---|---|
| `themeId` | `sinterklaas` |
| Name NL / EN | Sinterklaas / Sinterklaas (St Nicholas) — the theme is visible in English, with English labels |
| Season | **No date window.** Bert switches visibility on and off by hand. Leave `activeFrom`/`activeUntil` out; the switch is `isPublic` today and the theme status in the V2 dashboard later. |
| Colours (proposal) | primary `#B3261E` (deep red), accent `#F2B632` (gold), mapBackground `#FBEFD5` (cream) |
| Light | Dusk and lantern light outdoors, warm lamp and hearth light indoors |
| Density | "vol" (~25 actions per picture); locations are as busy as praatplaten |
| World / period | A Dutch town, steamboat era: wood, brick, brass, rope, jute, paper. Only the robots are futuristic. |
| `isPublic` | `false` until Bert has approved every image and sound and done the sensitivity check; then Bert flips it by hand |

### 1.2 Cast: no new robot, Bolt plays the Sint

Decided: **no seventh character.** One of the six fixed mascots dresses up as the Sint. **Bolt plays the Sint (approved)**, for three reasons:

- His body is already cherry-red, so "plenty of red" comes from the character itself and the costume only adds a red cape and mitre with gold.
- He is the biggest and broadest of the six, which gives the Sint presence among the helpers without a new body type.
- The Sint is then a red robot among helpers in every colour. The old light-master versus dark-servants colour coding cannot occur, because the colour logic of the cast does not allow it.

Bolt keeps everything that makes him Bolt: the boxy build, the thin antenna (it pokes out through the top of the mitre) and the round chest gauge (visible because the cape is open at the front). 
The other five wear the helper flavour: a velvet beret with one feather and a ruff collar, each in a different colour. Body colours never change.

| Member | Role in this theme |
|---|---|
| **Bolt (cherry-red)** | **The Sint**: red cape with gold trim, red mitre with a plain gold band, curled white metal-ribbon beard, golden spiral staff |
| Finn (copper-orange) | Wegwijspiet: navigator on the boat, hero of the storyboard |
| Pip (teal) | Rooftop courier, floats presents down chimneys |
| Nova (purple) | Leads the brass band |
| Ziggy (brass) | Built the wrapping machine |
| Mossy (green) | Stable master, looks after the robot horse; also carries (and drops) the sacks |

Two references are made for this theme, both stored in `.thema-studio/sinterklaas/stijlanker/`, not in `reference/cast/` (they are a costume and a theme prop, not new cast):

- **`sint-bolt.jpg`**: Bolt in the Sint costume, made from `reference/cast/bolt.jpg`. Prompt in §2.7.
- **`paard.jpg`**, the robot horse (Ozosnel): white-enamel mechanical horse with visible joints, rivets and glowing eyes. Horses are untested in Nano Banana Pro; the skill's rule applies: one generation plus one edit, then accept or design around it (horse small, half behind a chimney).

### 1.3 Cultural sensitivity: rules, not intentions

The helper figure is contested in the Netherlands because of blackface: dark face paint, red lips, curly wig, gold earrings, and a servant relation to a white master. The house style removes most of this by construction, because every character is a robot and robots come in all colours. One risk remains and must be named: **every SoundScout robot has a dark screen or visor face.** A robot in a page costume with a dark face panel can still read as the old caricature if other markers are added. The rules below prevent that.

| Do | Don't |
|---|---|
| Call them "helper robots in colourful page costumes" in every prompt | Never write "Zwarte Piet", "Black Pete", "moor", "blackface", "soot face" in a prompt. The model follows the words. |
| Give helpers the full robot colour range, no colour above ~20 % (existing rule A8) | No helper with a black or dark-brown body |
| Keep the standard screen face on **all** robots, Bolt-as-Sint included, so the face is a family trait and not a helper trait | No earrings, no red or human lips, no wig or curly hair, no soot or paint on any face screen |
| Mix roles: helpers steer, invent, conduct, bake; Bolt-as-Sint also carries a sack or stirs dough in at least one picture | No picture in which one figure commands a row of identical servants |
| Mix body types and sizes (boxy, android, chibi) among helpers | No cloned helpers in one pose |
| **Dutch texts** (UI, descriptions, lesson card) use "Piet" / "Pieten", always as helper robots: "de Pieten, de hulprobots van Sint". English texts use "helper robots". | Never a colour adjective with "Piet"; never "Piet" or any Dutch tradition word **in an image prompt** — prompts say "helper robots in page costumes" only |
| | No rod (roe), no child carried in a sack, no punishment motif |

**Review test (added to the checklist for this theme):** crop any helper to head and shoulders. If the crop reads as "robot", it passes. If it reads as "painted face in a costume", the image is rejected, whatever else is right.

**Final sensitivity check: Bert**, on the complete theme (every image, the Dutch and English texts), before `isPublic` goes to `true`. It is a hard gate.

Three tradition props collide with the no-text rule and are banned from prompts: chocolate letters, name tags on presents, and a boat name or number ("Pakjesboot 12"). The big book is shown closed.

### 1.4 Locations and sounds

Five locations, six sounds each: 25 effects and 5 music loops. Routes follow the sound skill: **F** = Freesound search (everything that exists in reality, animals included), **H** = Higgsfield `mirelo_text_to_audio` (machines and sounds that do not exist), **C** = checklist, which for music means **Bert makes the loop in Suno**. The skills do not generate music.

**1. `stoomboot` — De stoomboot / The Steamboat.** The boat docks at a decorated quay at dusk; helpers on deck and gangway, crowd of robots on the quay, band on a small stage.

| sampleId | NL / EN | Type, target | Route |
|---|---|---|---|
| `stoomboot-fluit` | Stoomfluit / Steam whistle | sfx 3 s | F |
| `stoomboot-machine` | Stoommachine / Steam engine | sfx 4 s, rhythmic | F |
| `stoomboot-golven` | Golven / Waves | sfx 6 s | F |
| `stoomboot-bel` | Scheepsbel / Ship's bell | sfx 3 s | F |
| `stoomboot-juichen` | Juichen / Cheering | sfx 5 s | F |
| `stoomboot-fanfare` | Fanfare / Brass band | loop 8.0 s | C (Suno), role: brass riff, low-mid |

**2. `dak` — Op het dak / On the Rooftops.** Moonlit roofs, chimneys, the robot horse stepping over tiles, a church tower behind.

| sampleId | NL / EN | Type, target | Route |
|---|---|---|---|
| `dak-hoeven` | Paardenhoeven / Horse hooves | sfx 4 s, rhythmic | F |
| `dak-hinnik` | Hinniken / Neigh | sfx 3 s | F |
| `dak-wind` | Wind / Wind | sfx 7 s | F |
| `dak-schoorsteen` | Pakje door de schoorsteen / Present down the chimney | sfx 3 s | H |
| `dak-torenklok` | Torenklok / Tower bell | sfx 5 s | F |
| `dak-sluipen` | Sluipmuziek / Tiptoe music | loop 8.0 s | C (Suno), role: pizzicato bass, fundament |

**3. `pakjeskamer` — De pakjeskamer / The Present Room.** Workshop interior with a conveyor belt, a brass wrapping machine, rolls of paper, shelves of parcels. **This is the anchor image.**

| sampleId | NL / EN | Type, target | Route |
|---|---|---|---|
| `pakjeskamer-papier` | Inpakpapier / Wrapping paper | sfx 3 s | F |
| `pakjeskamer-plakband` | Plakband / Sticky tape | sfx 2 s | F |
| `pakjeskamer-schaar` | Schaar / Scissors | sfx 2 s | F |
| `pakjeskamer-lopendeband` | Lopende band / Conveyor belt | sfx 5 s | H |
| `pakjeskamer-inpakmachine` | Inpakmachine / Wrapping machine | sfx 4 s | H |
| `pakjeskamer-speeldoos` | Speeldoos / Music box | loop 8.0 s | C (Suno), role: melody, high |

**4. `bakkerij` — De pepernotenbakkerij / The Pepernoten Bakery.** Brick oven, long table, dough mixer, trays, helpers scattering pepernoten.

| sampleId | NL / EN | Type, target | Route |
|---|---|---|---|
| `bakkerij-deeg` | Deeg kneden / Kneading dough | sfx 3 s | F |
| `bakkerij-strooien` | Pepernoten strooien / Scattering pepernoten | sfx 3 s | F |
| `bakkerij-ovenbel` | Ovenbel / Oven bell | sfx 2 s | F |
| `bakkerij-deegmachine` | Deegmachine / Dough mixer | sfx 5 s | H |
| `bakkerij-knabbelen` | Knabbelen / Crunching | sfx 3 s | F |
| `bakkerij-ritme` | Bakritme / Baking beat | loop 8.0 s | C (Suno), role: kitchen percussion, tone-neutral |

**5. `huiskamer` — De huiskamer / The Living Room.** Pakjesavond: hearth with shoes in front, front door, staircase, upright piano, a jute sack.

| sampleId | NL / EN | Type, target | Route |
|---|---|---|---|
| `huiskamer-klop` | Klop op de deur / Knock on the door | sfx 2 s | F |
| `huiskamer-deurbel` | Deurbel / Doorbell | sfx 2 s | F |
| `huiskamer-haard` | Open haard / Fireplace | sfx 7 s | F |
| `huiskamer-voetstappen` | Voetstappen / Footsteps | sfx 4 s | F |
| `huiskamer-zak` | Zak met pakjes / Sack of presents | sfx 3 s | F |
| `huiskamer-piano` | Piano / Piano | loop 8.0 s | C (Suno), role: chords, mid |

The five loop roles are the minimum band from `muziek-stems.md` (fundament, chords, melody, colour, percussion), so any combination stacks. Each sample also needs a Lucide icon; new ones (for example `Gift`, `Bell`, `Flame`) must be registered in `src/utils/iconMap.tsx` in the interim path.

### 1.5 Map, praatplaten, storyboard

- **Map** (landscape-map style, the only image with text): harbour bottom-left, rooftops top-centre, present room right, bakery centre, living room bottom-right, two unlabeled spare zones. Labels NL: `DE STOOMBOOT`, `OP HET DAK`, `DE PAKJESKAMER`, `DE BAKKERIJ`, `DE HUISKAMER`. Labels EN: `THE STEAMBOAT`, `THE ROOFTOPS`, `THE PRESENT ROOM`, `THE BAKERY`, `THE LIVING ROOM`. Files `plattegrond.jpg` and `plattegrond-en.jpg`.
- **Praatplaat 1, `pp-intocht`** ("De intocht" / "The Arrival"): street scene of the arrival parade, 20–30 mini-stories, category `feest`, `availableFor: 'both'`, all six cast members (Bolt as the Sint).
- **Praatplaat 2, `pp-pakjesavond`** ("Pakjesavond" / "Present Evening", in scope): cross-section of a house, from roof to cellar, `availableFor: 'teacher'`.
- **Promo, in scope:** title image NL ("Sinterklaas") and EN by targeted edit, plus a group poster of the cast in theme flavour.
- **Storyboard `pakjesjacht`** ("De pakjesjacht" / "The Present Chase"), four frames, hero Finn with Pip: (1) one parcel rolls off the conveyor and out of the window; (2) chase across the roofs; (3) Pip dives down a chimney after it; (4) the parcel lands in a shoe by the hearth. Cover: frame 2.

---

## 2. Visual workflow

### 2.1 Tools, as the skill names them

- **Primary:** Higgsfield CLI, model `nano_banana_pro`, through `scripts/genereer-afbeelding-higgsfield.py`. Two credits per image, four parameters only (`prompt`, `image_references`, `aspect_ratio`, `resolution`), no seed, up to 14 references.
- **Fallback:** Gemini API (same model) through `scripts/genereer-afbeelding.py` with `--style-ref`, only if `GEMINI_API_KEY` is set.
- **Post-processing:** `scripts/verwerk-afbeelding.py` (scale, centre-crop, JPEG quality 80, exactly 1920×1080).

### 2.2 Step order

1. Theme plan approved by Bert (gate, phase B).
2. Per image: mini-wizard (density, shot, palette and light, special wishes) and the **element list gate**: the full action list with the six sound sources marked, approved before generating.
3. **Anchor image:** `pakjeskamer`, generated without a style reference. Approved → `.thema-studio/sinterklaas/stijlanker/anker-01.jpg`. It goes into every later generation.
4. Bolt-as-Sint portrait and robot-horse portrait (`--aspect-ratio 1:1`). Approved → `stijlanker/sint-bolt.jpg`, `stijlanker/paard.jpg`. The Sint portrait may run in parallel with the anchor, because its main reference is `reference/cast/bolt.jpg` (§2.7).
5. Locations `stoomboot`, `dak`, `bakkerij`, `huiskamer`.
6. Map NL → map EN by targeted edit (labels only).
7. Praatplaat(en), with cast portraits as references.
8. Storyboard: the frame that shows the hero most completely first (frame 2), then the others with that frame as an extra reference.
9. Promo last: title image NL → EN by edit, group poster.

Maximum three iterations per image, one change per iteration, one model for the whole series.

### 2.3 Commands (run from the repo root)

```bash
IMG=.claude/skills/soundscout-afbeeldingen-generator/scripts
W=.thema-studio/sinterklaas

# generate (anchor: no --image-reference; later images: anchor + character refs)
python3 $IMG/genereer-afbeelding-higgsfield.py \
  --prompt-file $W/prompts/stoomboot-v1.txt --out $W/raw/stoomboot-v1.png \
  --image-reference $W/stijlanker/anker-01.jpg \
  --image-reference $W/stijlanker/sint-bolt.jpg \
  --aspect-ratio 16:9 --resolution 2k --manifest $W/manifest.json

# process and check
python3 $IMG/verwerk-afbeelding.py --in $W/raw/stoomboot-v1.png --out $W/kandidaten/stoomboot-v1.jpg
python3 $IMG/verwerk-afbeelding.py --check $W/kandidaten/stoomboot-v1.jpg

# targeted edit instead of regeneration
python3 $IMG/genereer-afbeelding-higgsfield.py --edit-van $W/kandidaten/stoomboot-v1.jpg \
  --prompt-file $W/prompts/stoomboot-v2-edit.txt --out $W/raw/stoomboot-v2.png --manifest $W/manifest.json
```

Keep `raw/*.png`. They are the only source for the V2 lossless masters. Note that `$W/manifest.json` is the skills' machine log, not the pack manifest of §4.

**References:** only canonical sources (`reference/cast/{naam}.jpg`, the approved anchor, the two theme portraits). Never a crop from a group image. Locations take the anchor plus `sint-bolt.jpg` or `paard.jpg` where that character appears; wherever Bolt-as-Sint appears, also send `reference/cast/bolt.jpg`, so his build cannot drift under the costume. Praatplaten and storyboards add the portraits of the cast members named in the prompt. Two or three targeted references beat fourteen vague ones.

**Edit prompt template:**

```
Reproduce the attached illustration EXACTLY: same composition, characters, colours,
line work and lighting. Change ONE thing only: <the change>. Everything else stays identical.
```

Edits work for adding or removing props, replacing map labels and removing stray text. They do not turn an organic animal into a mechanical one. A structural fault (composition, density, palette) means regenerating with a sharpened prompt.

### 2.4 Prompt templates

**Style block** (the skill's robot standard block, appended verbatim to every prompt):

```
All characters and animals are friendly cartoon ROBOTS in one consistent family: bold dark
outlines, cel-shaded. Every robot has a dark SCREEN or VISOR face with glowing eyes and a
simple drawn mouth (a glowing line or shape) — never a human mouth, teeth or lips. Metallic
paneled bodies with visible bolts and seams, jointed limbs. Wide diversity of robot COLORS
(silver, orange, red, blue, teal, gold, green, purple, pink, copper) with no single color
dominating (max ~20% per color); mix of body SHAPES (boxy retro tin-robots, sleek visor
androids, small round chibi bots) and SIZES (large, medium, tiny). EVERY animal is a clearly
MECHANICAL robot-animal built from metal panels with glowing eyes and visible joints, seams
and bolts — NEVER an organic or real animal, no fur, no feathers, no real skin.
```

**Theme block** (appended after the style block):

```
Theme flavour: the helper robots wear colourful page costumes — a velvet beret with one
feather and a ruff collar, each helper in a different colour. Props and buildings belong to
a Dutch town in the steamboat era: wood, brick, brass, rope, jute, paper; only the robots
are futuristic. Style: warm cartoon line-art, clean bold outlines, bright but slightly
weathered colours, deep red and gold accents, child-friendly, 4k detail.
```

**Avoid list** (the skill's fixed negative block plus the theme additions, always sent):

```
Negative: no text, letters, numbers, words, speech bubbles, labels or captions on or near
any element; no onomatopoeia or comic sound-effect words (no BOOM, POW, SPLASH, etc.);
no logos or watermarks; no realistic humans or real animals — robots only;
no letterbox, frame or borders; fill the entire 16:9 frame.
No human skin, hair, wigs, lips or earrings; no face paint, soot or make-up on any face
screen; no chocolate letters; no name tags on presents; no religious symbols; no name or
number on the boat; no shop signs or street signs.
```

**Location prompts.** Each is a complete skeleton; add ~15 approved background gags from the element list at the marked place. Position words are part of the source descriptions from version 1, because adding a separate composition paragraph later causes style drift (skill gotcha). Scene names are written in lower case so they do not become signs.

`prompts/pakjeskamer-v1.txt` (anchor)
```
Wide horizontal illustration, medium interior shot. A busy, detailed wimmelbild packed with
activity: a present workshop in an old brick warehouse, lit by warm hanging lamps.
Six clearly visible sound sources, spread wide apart across the middle of the picture:
(1) on the left, a helper robot unrolling a huge crackling sheet of wrapping paper;
(2) left of centre, a small robot tangled in a long strip of sticky tape it is pulling off a roll;
(3) in the centre foreground area, a robot snipping ribbon with oversized scissors;
(4) across the middle, a long rattling conveyor belt carrying parcels;
(5) on the right, a big brass wrapping machine with pistons, puffing steam, a parcel popping out;
(6) upper right on a shelf, a large open music box with a turning cylinder and a tiny dancing robot.
Around them: <15 approved gags>, and many more clumsy mishaps in the same spirit.
<style block> <theme block> <avoid list>
```

`prompts/stoomboot-v1.txt`
```
Wide horizontal illustration, wide establishing shot at dusk. A busy, detailed wimmelbild:
an old-fashioned steamboat docking at a decorated town quay, lanterns and bunting without lettering.
Six clearly visible sound sources, spread wide apart:
(1) upper left, the boat's brass steam whistle blowing a big white plume;
(2) left of centre on deck, an open hatch showing the pumping steam engine with pistons and a turning flywheel;
(3) lower left, waves slapping against the hull and the quay wall;
(4) centre, a helper robot ringing the ship's bell on the foredeck;
(5) right, a crowd of robots of all sizes cheering and waving on the quay;
(6) far right on a small stage, a robot brass band with tuba, trumpet and bass drum.
BOLT — big CHERRY-RED BOXY retro tin-robot with a thin antenna and a round chest gauge —
dressed as the Sint in a deep-red cape with gold trim and a tall red mitre with a plain gold
band, waves from the gangway (matches the attached references exactly).
Around them: <15 approved gags>.
<style block> <theme block> <avoid list>
```

`prompts/dak-v1.txt`
```
Wide horizontal illustration, high wide shot at night under a large moon. A busy, detailed
wimmelbild across the tiled rooftops of a Dutch town, warm light glowing from windows below.
Six clearly visible sound sources, spread wide apart:
(1) centre, a white-enamel mechanical robot horse with visible joints and rivets stepping carefully over the roof tiles (matches the attached reference exactly);
(2) the same horse's raised head, mouth open in a neigh, steam puffing from its nostrils;
(3) upper left, bare trees and a spinning weather vane bending in the wind, scarves flying;
(4) right of centre, a tiny floating robot dropping a parcel into a wide chimney, the parcel halfway in;
(5) upper right, a church tower with a large swinging bell in an open belfry, clock face without numerals;
(6) lower left on a flat roof, three robots tiptoeing in a row, one plucking a double bass.
Around them: <15 approved gags>.
<style block> <theme block> <avoid list>
```
Sources 1 and 2 share the horse. If the two hotspots end up too close (§2.6), move the neigh to a second, smaller foal-sized robot horse at the far left.

`prompts/bakkerij-v1.txt`
```
Wide horizontal illustration, medium interior shot. A busy, detailed wimmelbild: a
pepernoten bakery with a glowing brick oven, flour in the air, warm golden light.
Six clearly visible sound sources, spread wide apart:
(1) left, a strong boxy robot thumping and kneading a huge lump of dough on a wooden table;
(2) upper centre, a helper robot on a ladder scattering handfuls of small round spice cookies that rain and bounce on the floor;
(3) right, the oven door with a brass bell on top that a robot strikes with a spoon;
(4) left of centre, a tall dough-mixing machine with a spinning hook, dough climbing out;
(5) lower right area, two small robots crunching cookies, crumbs flying;
(6) centre, a kitchen band: robots drumming on tins, pans and a rolling pin with wooden spoons.
Around them: <15 approved gags>.
<style block> <theme block> <avoid list>
```

`prompts/huiskamer-v1.txt`
```
Wide horizontal illustration, medium interior shot, cross-section of a cosy living room and
hallway in the evening, lit by a hearth and table lamps.
Six clearly visible sound sources, spread wide apart:
(1) far left in the hallway, a gloved robot hand knocking on the front door from outside, the door shaking;
(2) upper left, a brass doorbell on a spring swinging wildly;
(3) centre, a crackling open fireplace with a row of shoes in front, a carrot in one shoe;
(4) right, a robot sneaking down a creaking wooden staircase;
(5) centre right on the floor, a bulging jute sack tipping over, parcels spilling out;
(6) left of centre, a purple robot with headphone ear-cups playing an upright piano.
Around them: <15 approved gags>.
<style block> <theme block> <avoid list>
```

The map uses the skill's map negative block instead ("no text except the specified sign/banner labels …") and lists the five labels in capitals, letter for letter.

### 2.5 Quality checklist per image

Run on the processed JPG, one line per item. One failure means the image does not go to Bert.

| # | Check | Source |
|---|---|---|
| 1 | Exactly 1920×1080 (`--check` exits 0), full frame, no letterbox | skill A1 + V2 rule 10 |
| 2 | No text, numbers, signs or onomatopoeia (map: labels letter-perfect, nothing else) | A2, M3 |
| 3 | Everything is a robot; screen faces; no human mouth, skin, hair | A5 |
| 4 | Animals mechanical (the horse) | A5b |
| 5 | **Head-and-shoulders crop test** on every helper; no black or brown helper bodies; no earrings, lips, wigs, face soot | §1.3 |
| 6 | Colour and shape diversity; no colour above ~20 %; red and gold present but not drowning everything | A4, A8 |
| 7 | Period props; no modern machines | A9 |
| 8 | Density reached (~25 actions; state that the count is an estimate) | A10, L1 |
| 9 | Six sound sources each unmistakable and matching one sample | L2, L4 |
| 10 | **Each source centre inside the safe zone:** y 12–88 % (V2 §6.1 rule 2), x 6–94 % (48 px marker edge note in the thema-studio skill) | V2 |
| 11 | **Spacing:** any two sources differ by at least 10 % in x or 16 % in y (provisional, see §2.6) | V2 rule 3 |
| 12 | Nothing essential in the top 15 % or bottom 12 % (current title pill and buttons, finding L5) | V2 |
| 13 | Bolt-as-Sint is still clearly Bolt (boxy, antenna, chest gauge, cherry-red); horse matches its portrait | S1, stijl-cast *Nooit* list |
| 14 | No AI artefacts, child-friendly | A6, A7 |

Bert approves; the skill only rejects.

### 2.6 From picture to hotspot estimate

1. Make a grid copy for reading (ffmpeg is installed; the `drawgrid` filter draws a 10×10 grid):
   ```bash
   ffmpeg -y -v error -i $W/kandidaten/dak-v1.jpg \
     -vf "drawgrid=w=192:h=108:t=2:c=white@0.7" $W/kandidaten/dak-v1-grid.jpg
   ```
2. Read the grid image. For each sound source take the centre of the *sounding part* (the bell, not the tower) and count cells: `x% = column position × 10`, `y% = row position × 10`, to the nearest 2–3 %.
3. Write the six pairs to the theme log with a "where in the picture" note. Today they go into `INTEGRATIE.md` as starting advice; in V2 they become `hotspots.json` with `"status": "draft"`.
4. Check rules 10 and 11 on the numbers. The spacing figure is my derivation, not a V2 constant: a 44 px minimum hotspot on the smallest supported scene (844×390 viewport, scene roughly 530×300) covers about 8 % of the width and 15 % of the height. The dashboard will own the real rule.

The estimate is a starting point. Final positions are always placed by Bert in the editor.

### 2.7 Ready to run: anchor image and Sint portrait

These two prompts are complete, with no placeholders. The skill's mini-wizard and element-list gate are filled in below with my defaults; **running the command counts as approving them.** Change a line in the prompt file first if a default is wrong.

**One-time setup (repo root):**

```bash
W=.thema-studio/sinterklaas
IMG=.claude/skills/soundscout-afbeeldingen-generator/scripts
mkdir -p $W/prompts $W/raw $W/kandidaten $W/stijlanker
higgsfield account status          # check the balance first: each run costs 2 credits
```

#### A. Anchor image `pakjeskamer` (no references)

Mini-wizard: density **vol** (~25 actions) · shot **medium interior** · light **warm hanging lamps, deep red and gold accents** · special: no cast members, so the anchor sets only the style and the helper flavour.

Element list (21 actions; the six sound sources are numbered and become the hotspots):

| # | Action | Sound source |
|---|---|---|
| 1 | Helper unrolls a huge crackling sheet of wrapping paper | `pakjeskamer-papier` |
| 2 | Small robot tangled in sticky tape | `pakjeskamer-plakband` |
| 3 | Robot snips ribbon with oversized scissors | `pakjeskamer-schaar` |
| 4 | Long rattling conveyor belt with parcels | `pakjeskamer-lopendeband` |
| 5 | Big brass wrapping machine, pistons and steam | `pakjeskamer-inpakmachine` |
| 6 | Open music box with a tiny dancing robot | `pakjeskamer-speeldoos` |
| 7–21 | Fifteen gags, listed in the prompt below | — |

Save as `$W/prompts/anker-01-v1.txt`:

```
Wide horizontal illustration, medium interior shot. A busy, detailed wimmelbild packed with
activity: a present workshop inside an old brick warehouse with wooden beams, lit by warm
hanging lamps, a cosy evening atmosphere with deep red and gold accents everywhere: red
ribbons, gold paper, red parcels, brass fittings.

Six clearly visible sound sources, spread wide apart across the middle of the picture:
(1) on the left, a helper robot unrolling a huge crackling sheet of shiny gold wrapping paper
that billows up like a wave;
(2) left of centre, a small round robot hopelessly tangled in a long strip of sticky tape it
is pulling off a big roll;
(3) in the lower middle, a robot snipping red ribbon with oversized scissors, ribbon curls
flying;
(4) across the middle of the room, a long rattling wooden conveyor belt on metal rollers
carrying parcels of every size;
(5) on the right, a big brass wrapping machine with pistons and pressure gauges, puffing
white steam, a neatly wrapped parcel popping out of its chute;
(6) upper right on a high shelf, a large open wooden music box with a turning brass
cylinder and a tiny robot dancing on its lid.

Around them, fifteen more clumsy mishaps: a robot stuck inside a half-wrapped box with only
its antenna poking out; two robots in a tug-of-war over the last roll of red paper; a tall
tower of parcels wobbling on a trolley; a tiny robot sliding down a stretched ribbon like a
zipline; a robot fast asleep on a pile of jute sacks; a giant gold bow stuck to a robot's
back; a robot squirting an oil can into the machine's gears; a parcel bouncing off the end
of the conveyor into a wicker basket; a robot weighing a parcel on old brass scales; a
tipped-over glue pot with a robot's feet stuck in it; paper confetti raining from a torn
sack in the rafters; a robot balancing a stack of round hat boxes; a robot painting stripes
on a wooden toy train; a robot testing a wooden rocking horse; helpers sorting parcels into
wooden pigeon-hole shelves along the back wall; and many more clumsy mishaps in the same
spirit.

All characters and animals are friendly cartoon ROBOTS in one consistent family: bold dark
outlines, cel-shaded. Every robot has a dark SCREEN or VISOR face with glowing eyes and a
simple drawn mouth (a glowing line or shape) — never a human mouth, teeth or lips. Metallic
paneled bodies with visible bolts and seams, jointed limbs. Wide diversity of robot COLORS
(silver, orange, red, blue, teal, gold, green, purple, pink, copper) with no single color
dominating (max ~20% per color); mix of body SHAPES (boxy retro tin-robots, sleek visor
androids, small round chibi bots) and SIZES (large, medium, tiny). EVERY animal is a clearly
MECHANICAL robot-animal built from metal panels with glowing eyes and visible joints, seams
and bolts — NEVER an organic or real animal, no fur, no feathers, no real skin.

Theme flavour: the helper robots wear colourful page costumes — a velvet beret with one
feather and a ruff collar, each helper in a different colour. Props and buildings belong to
a Dutch town in the steamboat era: wood, brick, brass, rope, jute, paper; only the robots
are futuristic. Style: warm cartoon line-art, clean bold outlines, bright but slightly
weathered colours, deep red and gold accents, child-friendly, 4k detail.

Negative: no text, letters, numbers, words, speech bubbles, labels or captions on or near
any element; no onomatopoeia or comic sound-effect words (no BOOM, POW, SPLASH, etc.);
no logos or watermarks; no realistic humans or real animals — robots only;
no letterbox, frame or borders; fill the entire 16:9 frame.
No human skin, hair, wigs, lips or earrings; no face paint, soot or make-up on any face
screen; no black or dark-brown robot bodies; no chocolate letters; no name tags or writing
on presents; no numbers on gauges or scales; no religious symbols; no shop signs.
```

Run:

```bash
python3 $IMG/genereer-afbeelding-higgsfield.py --prompt-file $W/prompts/anker-01-v1.txt \
  --out $W/raw/anker-01-v1.png --aspect-ratio 16:9 --resolution 2k --manifest $W/manifest.json
python3 $IMG/verwerk-afbeelding.py --in $W/raw/anker-01-v1.png --out $W/kandidaten/anker-01-v1.jpg
python3 $IMG/verwerk-afbeelding.py --check $W/kandidaten/anker-01-v1.jpg
```

Approved → `cp $W/kandidaten/anker-01-v1.jpg $W/stijlanker/anker-01.jpg`. It is also the `pakjeskamer` location image, and goes into every later generation.

#### B. Bolt as the Sint (portrait, 1:1)

Required reference: `reference/cast/bolt.jpg`. Add `$W/stijlanker/anker-01.jpg` as a second reference if the anchor is already approved; if not, run without it (the cast portraits were made theme-neutral, so the style still matches).

Save as `$W/prompts/sint-bolt-v1.txt`:

```
Clean full-body character portrait on a plain warm cream background, centred, square format.

BOLT — big CHERRY-RED BOXY retro tin-robot with a thin antenna and a round chest gauge —
dressed up as a kind, dignified saint-like figure for a festive December celebration. He
must match the attached reference portrait EXACTLY in body build, proportions, colour and
face; only the costume is added.

Costume: a long deep-red velvet cape with a wide gold trim, open at the front so his round
chest gauge stays fully visible; a tall red bishop-style mitre on his rectangular head with
one plain gold band and gold edging, no symbols on it, with his thin antenna poking out
through a small hole at the very top of the mitre; a full beard made of curled white metal
ribbons attached below his face screen, which leaves his glowing cyan eyes and simple smile
line on the dark screen completely visible; white gloves; in his right hand a tall golden
staff with a spiral top. Plenty of red, accented with gold.

Pose and expression: standing upright, calm and friendly, one hand raised in a gentle wave.

Style: bold dark outlines, cel-shaded, warm slightly weathered colours, child-friendly,
matching the SoundScout robot family.

Negative: no text, letters, numbers or symbols anywhere, no cross or religious symbol on the
mitre or staff; no realistic humans or real animals — robots only; no human mouths, lips or
teeth; no human skin or hair (the beard is clearly metal ribbon); no extra or floating limbs
or detached hands; do not change Bolt's body shape, size or base colour; do not make him
slim or android-like; do not remove his antenna or chest gauge; no letterbox or border.
```

Run:

```bash
python3 $IMG/genereer-afbeelding-higgsfield.py --prompt-file $W/prompts/sint-bolt-v1.txt \
  --out $W/raw/sint-bolt-v1.png --aspect-ratio 1:1 --resolution 2k \
  --image-reference .claude/skills/soundscout-afbeeldingen-generator/reference/cast/bolt.jpg \
  --manifest $W/manifest.json
python3 $IMG/verwerk-afbeelding.py --in $W/raw/sint-bolt-v1.png \
  --out $W/kandidaten/sint-bolt-v1.jpg --formaat vierkant
python3 $IMG/verwerk-afbeelding.py --check $W/kandidaten/sint-bolt-v1.jpg --formaat vierkant
```

Approved → `cp $W/kandidaten/sint-bolt-v1.jpg $W/stijlanker/sint-bolt.jpg`.

Things to check on this portrait: Bolt stays boxy and broad, antenna and gauge are visible, the eyes are cyan, the beard does not cover the face screen, and there is no cross or symbol. A wrong detail gets a targeted edit (§2.3), not a regeneration. Never use a crop of a later group picture as the Sint reference; always this portrait plus `bolt.jpg`.

**Gemini fallback:** per the skill, `scripts/genereer-afbeelding.py` takes the same arguments with `--style-ref` instead of `--image-reference`, and needs `GEMINI_API_KEY`. I have not checked that script's flags beyond the skill text.

---

## 3. Audio workflow

Claude cannot hear. Every choice below ends at Bert's ears through the listening page.

### 3.1 Acquisition per sound

Route F, all 21 searches in one batch, then one listening page:

```bash
SND=.claude/skills/soundscout-geluiden-verzamelen/scripts
python3 $SND/zoek-geluid.py --query "steam whistle boat" --min-duur 2 --max-duur 8 \
  --licentie cc0 --top 5 --download-map $W/kandidaten/audio/stoomboot-fluit/
python3 $SND/maak-audio-preview.py --map $W/kandidaten/audio --titel "Sinterklaas" --open
```

Few hits: broaden the query and use `--licentie alles-behalve-nc` (CC0 and CC-BY; NC and ND are excluded). The script writes a licence JSON next to every download; keep those files.

| sampleId | Query (first / fallback) |
|---|---|
| `stoomboot-fluit` | `steam whistle boat` / `steamboat horn` |
| `stoomboot-machine` | `steam engine chug loop` / `steam locomotive slow` |
| `stoomboot-golven` | `waves lapping harbour` / `water hull dock` |
| `stoomboot-bel` | `ship bell single` / `brass bell ring` |
| `stoomboot-juichen` | `children cheering crowd` / `kids cheer outdoor` |
| `dak-hoeven` | `horse hooves walk cobblestone` / `horse walk hard surface` |
| `dak-hinnik` | `horse neigh` / `horse whinny` |
| `dak-wind` | `wind howling trees` / `wind gust night` |
| `dak-torenklok` | `church bell single strike` / `tower clock bell` |
| `pakjeskamer-papier` | `wrapping paper rustle` / `paper crumple gift` |
| `pakjeskamer-plakband` | `tape dispenser pull` / `adhesive tape rip` |
| `pakjeskamer-schaar` | `scissors cutting paper` / `scissors snip` |
| `bakkerij-deeg` | `kneading dough` / `dough slap table` |
| `bakkerij-strooien` | `nuts falling wooden floor` / `marbles drop scatter` |
| `bakkerij-ovenbel` | `kitchen timer ding` / `oven bell` |
| `bakkerij-knabbelen` | `cookie crunch bite` / `eating crunchy` |
| `huiskamer-klop` | `knock wooden door three` / `door knocking` |
| `huiskamer-deurbel` | `old doorbell ring` / `mechanical doorbell` |
| `huiskamer-haard` | `fireplace crackling` / `wood fire close` |
| `huiskamer-voetstappen` | `footsteps wooden stairs creak` / `stairs walking down` |
| `huiskamer-zak` | `heavy sack drop` / `bag drop thud` |

Route H, four sounds, at most two or three attempts each (0.25 credit per second). The recipe: name a count, describe material and movement, keep it dry.

```bash
python3 $SND/genereer-geluid-higgsfield.py --duur 3 \
  --prompt "A cardboard parcel sliding down a brick chimney with a hollow whoosh, then one soft thud on a stone floor, clean and dry, no music, no reverb" \
  --out $W/kandidaten/audio/dak-schoorsteen/hf-v1.mp3 --manifest $W/manifest.json
```

| sampleId | Prompt |
|---|---|
| `pakjeskamer-lopendeband` | `A rubber conveyor belt on squeaky metal rollers running steadily, four small parcels bumping past, clean and dry, no music, no reverb` (5 s) |
| `pakjeskamer-inpakmachine` | `A brass wrapping machine: two pneumatic piston hisses, one mechanical clunk, then a single bright bell ding, clean and dry, no music, no reverb` (4 s) |
| `bakkerij-deegmachine` | `A heavy dough mixing machine with a slow steady motor hum and a hook slapping thick dough five times, clean and dry, no music, no reverb` (5 s) |

Route C, the five loops: **Bert generates them in Suno** (decided); the skill processes the result. Contract: 120 BPM, 4/4, straight marching feel, one key for the whole theme (G major), one instrument role per loop, dry, sparse, instrumental. The real vamp is read from what Suno actually plays, because Suno ignores chord charts. The ready prompts are in §3.5. Under Locked decision 3 loops are later stretched to 90, 105 and 135 BPM, which is one more reason to keep them dry and sparse.

### 3.2 What the scripts do today, and what V2 adds

`verwerk-geluid.py` today builds one ffmpeg filter chain: optional `atempo`, `apad`+`atrim` to `--duur-exact`, optional single-pass `loudnorm=I=-16:TP=-1.5:LRA=11`, fades, then `libmp3lame -b:a 128k`. `check-audio.py` accepts loops at 8.0 ± 0.05 s. Missing against V2 §6.3: silence trim, two-pass or static loudness, sample-exact length, WAV masters, fixed sample rate, measured loudness in a report. Two details differ from the skill text: short loop material is padded with silence, not looped; and normalisation is optional, so files processed without `--normaliseer` are not normalised.

**Decided: the strict V2 loudness rule applies to this release** (−16 LUFS integrated, true peak ≤ −1.5 dBTP before encoding). The chain below is therefore not a future target but the processing for every Sinterklaas sound. Until `verwerk-geluid.py` is updated it is run by hand; the gate script at the end of §3.4 enforces it.

**Step 0 — master.** Decode every chosen source to a WAV master at 44.1 kHz and keep it:
```bash
ffmpeg -y -v error -i kandidaat.mp3 -ar 44100 -c:a pcm_s24le masters/dak-hoeven.src.wav
```
Freesound downloads through the API token are 128 kbps MP3 previews. A WAV made from one is not a lossless master. For real masters Bert downloads the original file from the Freesound page while logged in.

**Step 1 — silence trim (effects only, never loops).** Leading silence, then trailing silence through the reverse trick:
```bash
ffmpeg -y -v error -i in.wav -af \
"silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01,areverse,\
silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse" trimmed.wav
# sox equivalent
sox in.wav trimmed.wav silence 1 0.01 0.1% reverse silence 1 0.05 0.1% reverse
```
The −50 dB threshold is a starting value; noisy field recordings need a higher one. Trimming a loop would shift the beat, so a loop is only cut on its bar lines.

**Step 2 — cut to length.** Effects: cut to the planned 2–8 s (`-t 4.0`). Loops: find a clean four-bar cycle of measured length *T*; real tempo = 960 / *T*. If *T* ≠ 8.000 s, stretch with pitch kept (`atempo`, factor = *T* / 8). Corrections under 2 % are inaudible; larger ones smear transients, so regenerate instead. Then force the length in samples: 8 s × 44 100 Hz = **352 800 samples**.
```bash
ffmpeg -y -v error -ss 12.34 -i suno.wav -af \
"atempo=1.016250,aresample=44100,apad=whole_len=352800,atrim=end_sample=352800" \
-c:a pcm_s24le masters/huiskamer-piano.wav
```
`atempo` output length is not guaranteed to the sample, which is why the pad and trim follow it.

**Step 3 — loudness.** Target (decided): **−16 LUFS integrated, true peak ≤ −1.5 dBTP.**

- Measured on the current assets (ffmpeg `ebur128`, today): `basis` median −16.5 LUFS (range −36 to −3), `winterspelen` −12.5 (−27 to −8), `piraten` −19.3 (−35 to −15). So −16 sits in the middle of what is already live, and it is the value the existing script uses.
- 24 of the 94 current files peak above −1 dBTP. MP3 encoding adds overshoot, and children stack up to twelve tracks into the master limiter, so headroom per sample is worth more than level. −1.5 dBTP before encoding leaves about 1 dB for the encoder.
- The new theme will be about 3 dB louder than `piraten` and about 3.5 dB quieter than `winterspelen`. Within one theme everything is even, which is what matters in a composition. Re-normalising the old themes to the same target is a separate follow-up, not part of this release.
- A short listening check on a tablet speaker and a digibord is still worth doing once the first sounds are processed; it checks the number, it does not reopen the decision.

Use a static gain, not dynamic normalisation. Dynamic `loudnorm` changes level over time, which bends short effects and can make the end of a loop louder than its start.
```bash
# measure
ffmpeg -hide_banner -nostats -i x.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -
# reads: input_i (LUFS), input_tp (dBTP)
# gain = min(-16 - input_i, -1.5 - input_tp)   → apply as one constant
ffmpeg -y -v error -i x.wav -af "volume=4.2dB" x.norm.wav
```
The two-pass `loudnorm` form (`measured_I`, `measured_TP`, `measured_LRA`, `measured_thresh`, `offset`, `linear=true`) gives the same result when it stays in linear mode, but it silently falls back to dynamic mode when the peak ceiling would be exceeded, and it resamples to 192 kHz unless `-ar 44100` is set. Check `normalization_type` in its output if it is used. Two honest limits: integrated loudness is unreliable for sounds under about one second (a single knock), and a very peaky sound cannot reach −16 LUFS under the ceiling. Both cases are flagged in the report and decided by ear; I am not sure a fixed rule exists that sounds right for all of them.

**Step 4 — de-click fades.** Effects: 10 ms in, 20–30 ms out. Loops: 3–5 ms at both ends only if the cut clicks; a longer fade makes an audible dip every eight seconds.
```bash
ffmpeg -y -v error -i x.norm.wav -af "afade=t=in:st=0:d=0.01,afade=t=out:st=3.97:d=0.03" masters/dak-hoeven.wav
```

**Step 5 — encode.** Policy: 44.1 kHz for everything (current files mix 44.1 and 48 kHz); CBR 128 kbps; loops stereo; effects mono when the source is mono or has no meaningful stereo image (halves decoded memory), otherwise stereo. Current files mix 128 and 192 kbps; 128 is the skill's standard.
```bash
ffmpeg -y -v error -i masters/dak-hoeven.wav -ar 44100 -ac 1 -c:a libmp3lame -b:a 128k derived/dak-hoeven.mp3
```

### 3.3 The MP3 padding caveat for loops

An MP3 cannot hold exactly 352 800 samples. Frames are 1 152 samples, so the stream is rounded up, and the encoder adds a start delay (LAME: 576 samples, plus 529 in the decoder). LAME writes both numbers into a header tag, and a decoder that reads the tag returns the exact original length. ffmpeg does. Whether every browser's `decodeAudioData` does, Safari in particular, I could not verify, and the skill itself records an hour lost to measuring this the wrong way.

```bash
# 1. ffmpeg honours the tag: must report exactly 352800
ffmpeg -v error -i derived/huiskamer-piano.mp3 -f s16le -ac 1 - | wc -c    # ÷ 2 = samples
# 2. the tag exists
ffprobe -v error -show_entries stream=start_time,duration_ts derived/huiskamer-piano.mp3
# 3. the seam: play three copies of the WAV master back to back, by ear
sox masters/huiskamer-piano.wav /tmp/seam.wav repeat 2 && afplay /tmp/seam.wav
```

Run the seam test on the WAV, not on concatenated MP3s (concatenation adds padding at every joint and proves nothing). In the app a loop repeats as scheduled clip events of 8.0 s each, so the encoder padding at the end is cut off; the real risk is an untrimmed start delay of about 25 ms, which makes a loop late against the grid. Recommendation for V2: the manifest stores `lengthSamples` for loops and the sample store checks and trims the decoded buffer once, so correctness does not depend on the browser. A real test on a school iPad decides whether that is needed.

### 3.4 Verification checklist per sound

| Check | How | Pass |
|---|---|---|
| Format | `check-audio.py --map … --loops "stoomboot-fanfare,dak-sluipen,pakjeskamer-speeldoos,bakkerij-ritme,huiskamer-piano"` | exit 0 |
| Effect length | same | 2–8 s |
| Loop length | sample count of the master and of the decoded MP3 | exactly 352 800 |
| Loudness, peak | `ebur128=peak=true` on the MP3 | −16 ± 1 LUFS, ≤ −1.0 dBTP after encoding |
| Leading silence | `silencedetect=noise=-50dB:d=0.02` | first sound within 20 ms |
| Sample rate, channels | `ffprobe -show_entries stream=sample_rate,channels` | 44 100; per policy |
| Tempo | length exactly 8.000 s with pitch unchanged; no click detector | — |
| Stack test | two loops on top of each other in the studio | **Bert, by ear** |
| Recognisable within one second | listening page | **Bert, by ear** |
| Source and licence recorded | `BRONNEN.md` row / `credits.json` entry | present for every file |

Use the **measured** durations in the data, never the planned ones.

**Interim loudness gate** (there is no dashboard to run it yet). Lists every MP3 with its loudness and true peak and exits with an error if one fails:

```bash
A=.thema-studio/sinterklaas/package/public/audio/themes/sinterklaas
fail=0
for f in $(find $A -name '*.mp3' | sort); do
  read I TP < <(ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 |
    awk '/Integrated loudness:/{getline; i=$2} /True peak:/{getline; p=$2} END{print i, p}')
  ok=$(awk -v i="$I" -v p="$TP" 'BEGIN{print (i>=-17 && i<=-15 && p<=-1.0) ? "ok" : "FAIL"}')
  printf "%-45s %6s LUFS %6s dBTP  %s\n" "$(basename $f)" "$I" "$TP" "$ok"
  [ "$ok" = "FAIL" ] && fail=1
done
exit $fail
```

The ±1 LU window and the −1.0 dBTP limit after encoding allow for what MP3 encoding does to a file mastered at exactly −16 / −1.5. Very short sounds (a single knock) may fail on loudness because integrated loudness is unreliable under about a second; those are listed in `LOGBOEK.md` with their value and approved by ear, not forced louder.

### 3.5 Suno prompts for the five loops

**Shared rules for all five** (from the skill's `muziek-stems.md`):

- Instrumental on. Put the style text in the style field and the exclusions in the **Exclude** field, not as "no drums" in the style text.
- Genre first, mood second, instruments third; the tempo as the number 120.
- Do not name songs, games or composers. The Sinterklaas sound comes from instruments and style: Dutch village brass band, street organ, music box, children's-song simplicity, a festive march. Traditional melodies are not quoted; I have not checked their rights.
- Everything in **G major**, "modal and static around one tonal centre", straight 4/4. A 6/8 or swing feel would not stack with the other loops.
- Dry, sparse, one role per loop.

**Order that works:** 1 (percussion, tone-neutral) → 2 (piano chords) → the three pitched loops, preferably made with the **upload/Cover route over the approved piano loop**, so they follow its harmony by ear. After the piano, write down the vamp Suno actually played; that becomes the contract.

| # | sampleId | Role | Register |
|---|---|---|---|
| 1 | `bakkerij-ritme` | percussion | full range, no pitch |
| 2 | `huiskamer-piano` | chords | mid |
| 3 | `stoomboot-fanfare` | brass riff | low-mid |
| 4 | `dak-sluipen` | bass, fundament | low |
| 5 | `pakjeskamer-speeldoos` | melody | high |

**1. `bakkerij-ritme` — Bakritme / Baking beat**
```
Style: Festive kitchen percussion groove, cheerful and busy, 120 BPM with a straight
marching feel. Wooden spoons on pots and pans, a woodblock, a tambourine and a shaker, in a
steady two-step march pattern with a light accent on beats two and four. Percussion only,
nothing else at all. Dry and close-miked, minimal reverb. Seamless loop, no fade in or out.
Instrumental only.
Exclude: vocals, melody, bass, piano, guitar, synth, bells, sleigh bells, choir
```
Alternative: replace the kitchen kit by "a small marching snare drum and a bass drum, like a village brass band's drum section".

**2. `huiskamer-piano` — Piano / Piano**
```
Style: Cosy Dutch children's party song, warm and homely, 120 BPM with a straight bouncy
feel. Upright piano only playing simple bouncing oom-pah chords, left hand on the beat,
right hand chords on the offbeat, in G major, modal and static around one tonal centre, no
chord changes. Piano only, nothing else at all. Dry and close-miked, minimal reverb.
Seamless loop, no fade in or out. Instrumental only.
Exclude: vocals, drums, bass, strings, choir, bells, synth
```
Alternative: "slightly out-of-tune old upright piano, honky-tonk tone" for more living-room character.

**3. `stoomboot-fanfare` — Fanfare / Brass band**
```
Style: Dutch village brass band march, festive arrival, proud and joyful, 120 BPM with a
straight marching feel. Tuba and trombones playing a short repeating oom-pah march riff,
in G major, modal and static around one tonal centre, no chord changes. Low brass only,
nothing else at all. Dry and close-miked, minimal reverb. Seamless loop, no fade in or out.
Instrumental only.
Exclude: vocals, drums, percussion, piano, strings, trumpet solo, choir, synth
```
Alternative with more character: "Dutch street barrel organ (draaiorgel) playing a cheerful march" instead of the brass. A street organ is a full arrangement on its own, so it stacks less well; use it only if the brass version is too dull.

**4. `dak-sluipen` — Sluipmuziek / Tiptoe music**
```
Style: Playful sneaking cartoon music, mischievous and quiet, tiptoeing over rooftops at
night, 120 BPM with a straight feel. Pizzicato double bass only, plucking a short light
staccato walking pattern that stays on a low G for two bars, then moves to D, then back.
Double bass only, nothing else at all. Dry and close-miked, minimal reverb. Seamless loop,
no fade in or out. Instrumental only.
Exclude: vocals, drums, percussion, piano, violin, melody, choir, synth
```
Alternative: "bassoon playing short staccato tiptoe notes" for a woodier sneaking sound.

**5. `pakjeskamer-speeldoos` — Speeldoos / Music box**
```
Style: Magical music box lullaby, sparkling and twinkly, a December evening, 120 BPM with a
straight feel. Music box only playing a simple, short repeating melody in eighth notes, in
G major, modal and static around one tonal centre, no chord changes. Music box only,
nothing else at all. Dry and close-miked, minimal reverb. Seamless loop, no fade in or out.
Instrumental only.
Exclude: vocals, drums, bass, piano, strings, pad, choir, synth, reverb
```
Alternative: "glockenspiel" instead of the music box; it cuts through a full timeline better.

**After generating:** Bert delivers the Suno download (WAV if the plan offers it, otherwise MP3). Processing then follows §3.2: find a clean four-bar section, measure its length *T* (tempo = 960 / *T*), stretch only if the difference is under 2 %, force exactly 352 800 samples, normalise, fade 3–5 ms only if it clicks. The final test is two loops stacked in the studio, by ear.

---

## 4. Integration into the V2 theme pack

### 4.1 Target layout (format proposed in §6.3, not built)

```
sinterklaas.sspack
├── manifest.json
├── credits.json
├── hotspots.json
├── report.json
├── images/masters/   pakjeskamer.png  stoomboot.png  dak.png  bakkerij.png  huiskamer.png
│                     plattegrond-nl.png  plattegrond-en.png
│                     pp-intocht.png  pp-pakjesavond.png  pakjesjacht-1.png … pakjesjacht-4.png
├── images/derived/   <name>-640.avif|webp|jpg  <name>-1280.…  <name>-1920.…  <name>-blur.jpg
├── audio/masters/    stoomboot-fluit.wav … huiskamer-piano.wav        (30 files)
└── audio/derived/    stoomboot-fluit.mp3 … huiskamer-piano.mp3        (30 files)
```

The field names below are illustrative. The real schema will be exported from the app's Zod schema in Phase 3.

```json
{
  "schemaVersion": 1,
  "id": "sinterklaas",
  "visibility": "manual",
  "colors": { "primary": "#B3261E", "accent": "#F2B632", "mapBackground": "#FBEFD5" },
  "texts": {
    "nl": { "name": "Sinterklaas", "description": "Van stoomboot tot pakjesavond." },
    "en": { "name": "Sinterklaas", "description": "From steamboat to present evening." }
  },
  "map": {
    "image": { "nl": "plattegrond-nl", "en": "plattegrond-en" },
    "positions": [{ "locationId": "stoomboot", "x": 18, "y": 72 }]
  },
  "locations": [{
    "id": "stoomboot", "image": "stoomboot",
    "texts": { "nl": { "name": "De stoomboot" }, "en": { "name": "The Steamboat" } },
    "samples": [
      { "id": "stoomboot-fluit", "kind": "sfx", "file": "stoomboot-fluit.mp3", "duration": 3.02,
        "icon": "Megaphone", "color": "#FBBF24",
        "texts": { "nl": "Stoomfluit", "en": "Steam whistle" } },
      { "id": "stoomboot-fanfare", "kind": "loop", "file": "stoomboot-fanfare.mp3",
        "duration": 8.0, "lengthSamples": 352800, "bpm": 120, "bars": 4,
        "texts": { "nl": "Fanfare", "en": "Brass band" } }
    ]
  }]
}
```

```json
{
  "stoomboot-fluit.mp3": { "source": "freesound", "url": "https://freesound.org/people/<user>/sounds/<id>/",
    "author": "<user>", "title": "<original title>", "licence": "CC-BY-4.0" },
  "pakjeskamer-inpakmachine.mp3": { "source": "higgsfield", "model": "mirelo_text_to_audio",
    "jobId": "<id>", "prompt": "prompts/audio/pakjeskamer-inpakmachine-v2.txt" },
  "huiskamer-piano.mp3": { "source": "suno", "author": "Bert van Uffelen", "prompt": "MUZIEK-SUNO.md#piano" },
  "stoomboot.png": { "source": "higgsfield", "model": "nano_banana_pro", "jobId": "<id>",
    "prompt": "prompts/stoomboot-v2.txt", "approved": "2026-…" }
}
```

`hotspots.json` holds the §2.6 estimates per location as `{ "sampleId", "x", "y", "status": "draft" }`.

### 4.2 Checks the dashboard runs on import

The dashboard re-runs everything and does not trust `report.json`.

| Area | Check |
|---|---|
| Schema | manifest valid; every id unique; every sample has a file, every file a sample |
| Texts | NL and EN present for every name; identical key sets |
| Images | exactly 1920×1080 (a hard failure, no crop); all derived widths present |
| Audio | effects 2–8 s; loops exactly 8.000 s; loudness and true peak within target; format and sample rate |
| Credits | source and licence for every asset; no NC or ND; CC-BY entries complete (author, URL) |
| Hotspots | inside the safe zone; no overlap on the smallest supported scene; one per sample |
| Map | every location has a position; markers do not overlap |
| Visibility | none for this theme (manual switch); a season window, if a later theme uses one, must be valid |

### 4.3 Hotspots and publishing

Import creates a **draft**. Bert opens each location in the dashboard editor, plays each hotspot, drags it onto its source; the safe-zone and spacing rules block invalid positions live. Then: preview as student → publish (an immutable version `v1`) → the colofon updates from `credits.json`. A correction becomes `v2`; running assignments keep the version they started with.

### 4.4 Interim path (works today)

1. Work in `.thema-studio/sinterklaas/` with `themaplan.md`, `LOGBOEK.md`, `manifest.json`, `prompts/`, `raw/`, `kandidaten/`, `stijlanker/`, `package/`.
2. Phase E of the thema-studio skill writes `src/data/themes/sinterklaas/{index,locations,samples,map}.ts`, i18n fragments, `BRONNEN.md`, `INTEGRATIE.md`.
3. Paths: `/images/themes/sinterklaas/{locationId}.jpg`, `plattegrond.jpg`, `plattegrond-en.jpg` (through `backgroundImageByLocale`), `/audio/themes/sinterklaas/{locationId}/{sampleId}.mp3`, `/images/praatplaten/intocht.jpg`, `/images/storyboards/pakjesjacht/pakjesjacht-{1..4}.jpg`.
4. `python3 .claude/skills/soundscout-thema-studio/scripts/check-pakket.py --pakket .thema-studio/sinterklaas/package` must be green.
5. On Bert's request: copy assets, register the theme, merge i18n, add praatplaat and storyboard entries, register new icons, `npm run build`.
6. Bert places hotspots in `/editor?location={locationId}` and pastes the JSON; only `x`/`y` per `sampleId` are merged back.
7. Leave `activeFrom`/`activeUntil` out. After Bert's sensitivity check, flip `isPublic` to `true`, build and upload; after 5 December flip it back to `false`. A hidden theme keeps working for running assignments and `?theme=sinterklaas`, so switching it off breaks nothing.
8. English: every i18n key in `en.json` (location and sample names as in §1.4) and the EN map in `backgroundImageByLocale`. `v2-launch-strategy.md` has been aligned: culture-bound themes are bilingual.

**Keep for the later conversion:** `raw/*.png`, the WAV masters, the licence JSON files, every prompt file and job id. With those, the Phase 3 migration script can build the pack without regenerating anything.

---

## 5. Schedule and cost

### 5.1 Steps and gates

| # | Step | Who | Gate |
|---|---|---|---|
| 1 | Brainstorm and intake (phase A) | Bert + thema-studio | — |
| 2 | Theme plan, element lists, music contract (B) | thema-studio | **Bert approves the plan** |
| 3 | Anchor image (§2.7 A) | afbeeldingen-generator or Bert | **Bert approves the anchor** |
| 4 | Bolt-as-Sint (§2.7 B) and horse portraits | afbeeldingen-generator or Bert | **Bert approves, with the §1.3 review** |
| 5 | Four locations, map NL and EN | afbeeldingen-generator | Bert approves each image |
| 6 | Freesound batch, listening page | geluiden-verzamelen | **Bert chooses by ear** |
| 7 | Four generated effects | geluiden-verzamelen | Bert, by ear |
| 8 | Five Suno loops (§3.5) | **Bert** generates; skill processes | Bert: stack test |
| 9 | Praatplaat(en), storyboard, promo | afbeeldingen-generator | Bert approves each image |
| 10 | Processing, checks, assembly (E) | geluiden-verzamelen, thema-studio | `check-pakket.py` green; Bert approves |
| 11 | Integration, hotspots | thema-studio; **Bert** in the editor | Bert plays the theme end to end |
| 12 | Final sensitivity check of the whole theme, NL and EN | **Bert** | hard gate before `isPublic: true` |
| 13 | Upload to soundscout.nl, log in the dossier | Bert | — |

**Compressed timeline for a 26 November go-live** (ten working days, in parallel tracks):

| Days | Images | Sound | Bert |
|---|---|---|---|
| 15–16 Nov | anchor, Bolt-as-Sint, horse | Freesound batch for all 21 searches; Suno loops 1 and 2 | approve 3 images; generate 2 loops |
| 17–19 Nov | four locations, map NL + EN | listening page; four generated effects; Suno loops 3–5 | approve 6 images; choose sounds |
| 20–22 Nov | both praatplaten, storyboard (4 frames) | processing and loudness gate for all 30 | approve 6 images; stack test |
| 23–24 Nov | promo: title NL + EN, group poster | — | approve 3 images |
| 24–25 Nov | assembly, `check-pakket.py`, integration, build | — | place 30 hotspots; play the theme end to end |
| 25–26 Nov | — | — | sensitivity check; switch on; upload |

Bert's own time is the bottleneck: about 18 image approvals, one listening session of about 100 candidates, five Suno loops, 30 hotspots and the final check, all inside ten days. If it slips, the order of what can wait is: promo images, then the storyboard, then the second praatplaat. The locations, map and sounds are the theme itself.

### 5.2 Budget (the skills' own rules)

| Item | Count | Generations (×2.5) | Credits |
|---|---|---|---|
| Location images | 5 | 13 | 26 |
| Bolt-as-Sint and horse portraits | 2 | 5 | 10 |
| Map NL + EN | 2 | 4 (EN is one edit) | 8 |
| Praatplaten | 2 | 5 | 10 |
| Storyboard frames | 4 | 10 | 20 |
| Promo (title NL + EN, group poster) | 3 | 7 | 14 |
| **Images** | **18** | **≈ 44** | **≈ 88** |
| Generated effects | 4 × up to 3 tries × ~1 credit | | ≤ 12 |
| **Total** | | | **≈ 100** |

Full scope is kept (decided): both praatplaten and all promo images. This matches the skill's figure of about 100 credits per theme. Bert monitors budget and time himself. The account receives 150 credits on the 10th of each month and unused credits expire; the next reset is 10 December, after this release. The skill still reports at twice the budget or below 30 credits, as information only. Freesound is free. Suno runs on Bert's own account. The Gemini fallback would cost roughly $7–12 for the same images. I did not query the current balance.

### 5.3 Risks

| Risk | Effect | Mitigation |
|---|---|---|
| A helper image reads as the old caricature | Reputational damage with schools | §1.3 rules, crop test, Bert's final check before publishing |
| Robot horse comes out organic | Wasted credits | One try plus one edit, then design around it |
| Bolt loses his build or antenna under the Sint costume | Inconsistent cast | `bolt.jpg` plus `sint-bolt.jpg` in every scene, the literal Bolt sentence, the *Nooit* list in the negative block |
| Ten-day production window | Theme late or rushed | Parallel tracks in §5.1; fixed order of what can slip |
| Stray text (boat name, parcels, clock numerals) | Rejected images | Avoid list; targeted edit |
| Safe-zone and spacing rules fail on busy scenes | Extra regenerations | Position words in the source list from version 1 |
| Suno loops not at 120 BPM or clashing | Unusable stack | Contract first, percussion first, upload route, stretch under 2 % only |
| MP3 start delay not trimmed in some browser | Loops late against the grid | §3.3 test on a school iPad; `lengthSamples` trim |
| Freesound previews as "masters" | Weak source for V2 | Download originals for the chosen sounds |
| Loudness differs from the old themes | New theme sounds louder than `piraten` | Expected (§3.2); re-normalise the old themes as a follow-up |
| Pack format changes in Phase 3 | Rework | Interim path plus kept masters; nothing is format-bound |

---

## 6. Decisions (Bert, 15-11-2026) and what is still open

| # | Topic | Decision | Where it changed the plan |
|---|---|---|---|
| 1 | Release | 2026 interim release through the current TypeScript path, live this November | header, §4.4, §5.1 |
| 2 | Language | Visible in English, with English labels ("The Steamboat") | §1.1, §4.4 step 8 |
| 3 | Helper term | Dutch texts use "Piet" for the helper robots; never in image prompts | §1.3 |
| 4 | The Sint | Plain gold band on the mitre, plenty of red; **no seventh robot**, Bolt plays the Sint | §1.2, §2.7 B |
| 5 | Sensitivity | Bert does the final check himself, as a hard gate | §1.3, §5.1 step 12 |
| 6 | Visibility | Manual on/off switch, no date window | §1.1, §4.4 step 7 |
| 7 | Music | Bert generates the loops in Suno | §3.1, §3.5 |
| 8 | Loudness | Strict V2 rule now: −16 LUFS, −1.5 dBTP | §3.2, §3.4 gate |
| 9 | Scope | Full scope, second praatplaat and all promo images kept; Bert watches budget and time | §1.5, §5.2 |

Closed on 15-11-2026, no open questions remain:

10. **Cast:** Bolt plays the Sint; Mossy is stable master and sack carrier. Approved.
11. **Launch strategy:** `v2-launch-strategy.md` updated: culture-bound themes such as Sinterklaas are bilingual (NL/EN).
