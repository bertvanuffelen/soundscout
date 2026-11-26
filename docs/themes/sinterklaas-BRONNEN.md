# Bronnen — thema Sinterklaas

Ronde 1 (35 geluiden) en ronde 2 (26-11-2026: zes extra effectgeluiden per locatie, op wens van Bert).
Zes keuzes uit ronde 1 zijn na Berts luistersessie gewisseld: stoomboot-machine, dak-torenklok,
bakkerij-deegmachine, bakkerij-niezen, huiskamer-klop en huiskamer-voetstappen.
Na de tweede luistersessie zijn er nog vijf gewisseld: stoomboot-camera, stoomboot-pakjes,
dak-ladder, bakkerij-muis en huiskamer-papier.

65 geluiden: 55 van [Freesound](https://freesound.org) (alleen CC0 en CC BY, nooit NC of ND),
5 gegenereerd met Higgsfield (`mirelo_text_to_audio`), 5 muziekloops zelf gemaakt
(synthese in code; het bakritme is gesequenced uit drie CC0-slagen, zie onderaan).
CC BY vereist naamsvermelding; die staat ook in `src/data/credits.ts` (colofon op /over).

Verwerking (alle bestanden): venster gekozen, bij losse geluiden de stilte aan begin en eind
eraf (drempel −45 dB), vaste gain naar −15 LUFS short-term-max met plafond −1,5 dBTP
(4× overgesampelde limiter, alleen waar nodig, hoogstens 12 dB), fades 8 ms in en 30 ms uit
(texturen 50 ms / 250 ms), 44,1 kHz, CBR 128 kbps. Effecten 2–8 s; loops exact 8,0 s.

| Sample | Geluid | Maker | Licentie | Bron | Bewerking |
|---|---|---|---|---|---|
| `stoomboot-fluit.mp3` | Steam Whistle.mp3 | Bidone | CC0 1.0 | https://freesound.org/people/Bidone/sounds/71778/ | venster 0.01–3.15 s, stilte-trim, gain +4.7 dB, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-machine.mp3` | Steam engine | SamsterBirdies | CC0 1.0 | https://freesound.org/people/SamsterBirdies/sounds/558259/ | venster 0.00–7.70 s, gain -1.3 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-golven.mp3` | Water lapping on lake Pukaki,South Island,New Zealand.mp3 | laughatlantic | CC0 1.0 | https://freesound.org/people/laughatlantic/sounds/528067/ | venster 4.00–11.00 s, gain +14.4 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `stoomboot-bel.mp3` | Ship Bell Single Ring | Sojan | CC0 1.0 | https://freesound.org/people/Sojan/sounds/353233/ | venster 0.12–2.13 s, stilte-trim, gain +13.6 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `stoomboot-juichen.mp3` | Children Cheering Inside School | Moulaythami | CC0 1.0 | https://freesound.org/people/Moulaythami/sounds/640855/ | venster 0.60–6.80 s, stilte-trim, gain -10.2 dB, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-plons.mp3` | Big Water Splash | qubodup | CC0 1.0 | https://freesound.org/people/qubodup/sounds/442773/ | venster 0.00–2.12 s, stilte-trim, gain +1.4 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `dak-hoeven.mp3` | SFX - Horse - Walk.wav | MrFizzywig | CC0 1.0 | https://freesound.org/people/MrFizzywig/sounds/581833/ | venster 0.00–7.48 s, stilte-trim, gain +14.5 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `dak-hinnik.mp3` | horse neigh shortened.wav | shadoWisp | CC0 1.0 | https://freesound.org/people/shadoWisp/sounds/269571/ | venster 0.10–2.10 s, stilte-trim, gain +16.9 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `dak-wind.mp3` | Wind.ogg | egomassive | CC0 1.0 | https://freesound.org/people/egomassive/sounds/536776/ | venster 0.00–8.00 s, gain +7.0 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `dak-torenklok.mp3` | Church Bell.wav | MVMTech | CC0 1.0 | https://freesound.org/people/MVMTech/sounds/569356/ | venster 0.00–4.98 s, stilte-trim, gain -1.3 dB, fades, stereo 44,1 kHz 128 kbps |
| `dak-kat.mp3` | cat meow | tuberatanka | CC0 1.0 | https://freesound.org/people/tuberatanka/sounds/110011/ | venster 0.00–2.00 s, stilte-trim, gain -3.7 dB, fades, stereo 44,1 kHz 128 kbps |
| `dak-schoorsteen.mp3` | gegenereerd: “One wrapped gift box tumbling down inside a narrow brick chimney, three hollow bumps getting lower, then a single muffled thump landing in soft ashes, clean and dry, no music, no reverb, no voices” | Higgsfield `mirelo_text_to_audio` (job `74125512-3e8d-4455-b198-af0320a1302d`) | eigen gebruik, geen vermelding nodig | — | venster 0.00–3.00 s, stilte-trim, gain +28.2 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `pakjeskamer-papier.mp3` | Paper Bag and Bottle Wrap Up FF390.aif | martinimeniscus | CC0 1.0 | https://freesound.org/people/martinimeniscus/sounds/199346/ | venster 0.21–5.70 s, stilte-trim, gain +19.7 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-plakband.mp3` | Ripping/unravelling packaging tape | elle-trudgett | CC0 1.0 | https://freesound.org/people/elle-trudgett/sounds/151446/ | venster 0.27–4.74 s, stilte-trim, gain -0.8 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `pakjeskamer-schaar.mp3` | scissors cutting paper.wav | Kiyoshiakira | CC0 1.0 | https://freesound.org/people/Kiyoshiakira/sounds/436769/ | venster 0.19–4.01 s, stilte-trim, gain +12.3 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-hond.mp3` | Animal Dog Bark 21.wav | abhisheky948 | CC0 1.0 | https://freesound.org/people/abhisheky948/sounds/625496/ | venster 0.00–2.00 s, stilte-trim, gain +11.1 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-lopendeband.mp3` | gegenereerd: “A small factory conveyor belt with a steady electric motor hum and evenly spaced rhythmic roller clicks, constant speed, clean and dry, no music, no reverb, no voices” | Higgsfield `mirelo_text_to_audio` (job `a4f9b162-d1df-4710-a6b3-99afb0c91c1c`) | eigen gebruik, geen vermelding nodig | — | venster 0.00–5.00 s, gain +15.8 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `pakjeskamer-inpakmachine.mp3` | gegenereerd: “A steampunk gift wrapping machine cycle: gears ratcheting four times, one steam hiss, a heavy metal stamp clunk, ending with one small bright bell ding, clean and dry, no music, no reverb, no voices” | Higgsfield `mirelo_text_to_audio` (job `a263d5fe-3565-4dbc-a9b5-ba08d36fc83a`) | eigen gebruik, geen vermelding nodig | — | venster 0.00–3.26 s, stilte-trim, gain +16.3 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-deeg.mp3` | Baking bread (SoundAction 052) | alexarje | CC BY 4.0 | https://freesound.org/people/alexarje/sounds/721734/ | venster 0.00–5.80 s, stilte-trim, gain +10.2 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-strooien.mp3` | Nuts Drop Hazelnut | EminYILDIRIM | CC0 1.0 | https://freesound.org/people/EminYILDIRIM/sounds/536089/ | venster 0.00–2.00 s, stilte-trim, gain +7.2 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `bakkerij-ovenbel.mp3` | Ringing bell - happy.wav | domrodrig | CC0 1.0 | https://freesound.org/people/domrodrig/sounds/116779/ | venster 0.26–2.26 s, stilte-trim, gain +9.1 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `bakkerij-knabbelen.mp3` | Crunchy cookie eating.wav | Morgan169 | CC0 1.0 | https://freesound.org/people/Morgan169/sounds/362024/ | venster 0.00–4.60 s, stilte-trim, gain +10.5 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-niezen.mp3` | Sneeze, Single, B.wav | InspectorJ | CC BY 4.0 | https://freesound.org/people/InspectorJ/sounds/368804/ | venster 0.29–2.29 s, stilte-trim, gain +3.7 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `bakkerij-deegmachine.mp3` | KitchenAid Mixer 2. | Tom_Kaszuba | CC0 1.0 | https://freesound.org/people/Tom_Kaszuba/sounds/658329/ | venster 5.00–11.00 s, gain +3.0 dB, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-klop.mp3` | knocking - 3 quick knocks | Tysto | CC BY 4.0 | https://freesound.org/people/Tysto/sounds/861000/ | venster 0.24–2.24 s, stilte-trim, gain +10.8 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `huiskamer-deurbel.mp3` | bel1.aif | eliasheuninck | CC0 1.0 | https://freesound.org/people/eliasheuninck/sounds/2539/ | venster 0.01–4.50 s, stilte-trim, gain -1.1 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `huiskamer-haard.mp3` | fire-crackling.wav | jmehlferber | CC0 1.0 | https://freesound.org/people/jmehlferber/sounds/370938/ | venster 2.00–9.00 s, gain +10.8 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-voetstappen.mp3` | footsteps_down_stairs_3.WAV | sinatra314 | CC BY 3.0 | https://freesound.org/people/sinatra314/sounds/209474/ | venster 0.00–6.59 s, stilte-trim, gain +9.5 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-zak.mp3` | Luggage Drop 3.wav | stephenbist | CC0 1.0 | https://freesound.org/people/stephenbist/sounds/434783/ | venster 0.07–2.07 s, stilte-trim, gain +12.8 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-klok.mp3` | Old clock tick-tock | Duasun | CC0 1.0 | https://freesound.org/people/Duasun/sounds/323626/ | venster 0.40–6.40 s, gain +10.4 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-kolen.mp3` | Forge - Adding coal | ldezem | CC0 1.0 | https://freesound.org/people/ldezem/sounds/386143/ | venster 0.01–2.27 s, stilte-trim, gain +10.8 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-camera.mp3` | Film Camera Click Shutter | drewtait | CC0 1.0 | https://freesound.org/people/drewtait/sounds/676375/ | venster 0.10–2.62 s, stilte-trim, gain +10.0 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `stoomboot-hond.mp3` | Puppy Bark | AntumDeluge | CC0 1.0 | https://freesound.org/people/AntumDeluge/sounds/583142/ | venster 0.02–2.02 s, stilte-trim, gain +10.8 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `stoomboot-ballonnen.mp3` | Squeak 001 | mjvilches | CC0 1.0 | https://freesound.org/people/mjvilches/sounds/362198/ | venster 0.41–3.32 s, stilte-trim, gain +9.0 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-pakjes.mp3` | falling shoe boxes 2.wav | fresco | CC BY 4.0 | https://freesound.org/people/fresco/sounds/33798/ | venster 0.00–5.35 s, stilte-trim, gain +0.6 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `stoomboot-touw.mp3` | Stretch - Medium | NearTheAtmoshphere | CC0 1.0 | https://freesound.org/people/NearTheAtmoshphere/sounds/676987/ | venster 0.09–2.49 s, stilte-trim, gain +11.7 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `dak-sneeuw.mp3` | gegenereerd: “A big heap of wet snow sliding down a tiled roof with a soft rushing whoosh, then one heavy muffled thump as it lands, clean and dry, no music, no reverb, no voices” | Higgsfield `mirelo_text_to_audio` (job `58ca11b2-3e83-45e2-ad86-be44ea86af0d`) | eigen gebruik, geen vermelding nodig | — | venster 0.00–4.00 s, stilte-trim, gain +19.3 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `dak-ladder.mp3` | boots on aluminum ladder 01 | Eelke | CC BY 4.0 | https://freesound.org/people/Eelke/sounds/462598/ | venster 0.66–7.20 s, stilte-trim, gain +17.3 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `dak-dakpan.mp3` | tiles smashing.mp3 | ToaTom | CC0 1.0 | https://freesound.org/people/ToaTom/sounds/148036/ | venster 0.14–2.14 s, stilte-trim, gain -0.3 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `dak-raam.mp3` | Opening a window.mp3 | Caitlin_100 | CC0 1.0 | https://freesound.org/people/Caitlin_100/sounds/365508/ | venster 0.05–2.13 s, stilte-trim, gain +7.8 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `dak-brieven.mp3` | Papers Flapping; Intense.wav | RossBell | CC0 1.0 | https://freesound.org/people/RossBell/sounds/389440/ | venster 0.04–3.59 s, stilte-trim, gain +11.1 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `dak-pof.mp3` | Poof of Smoke | Planman | CC0 1.0 | https://freesound.org/people/Planman/sounds/208111/ | venster 0.18–2.18 s, stilte-trim, gain +12.3 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-weegschaal.mp3` | paisaje-sonoro-uem-Pesas.wav | almalaut | CC0 1.0 | https://freesound.org/people/almalaut/sounds/377969/ | venster 0.24–2.24 s, stilte-trim, gain +4.1 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-trein.mp3` | Toy Train Whistle3.aif | timgormly | CC0 1.0 | https://freesound.org/people/timgormly/sounds/162803/ | venster 0.02–2.68 s, stilte-trim, gain +8.6 dB, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-hobbelpaard.mp3` | Creaking Wood 2.wav | Greg_Surr | CC0 1.0 | https://freesound.org/people/Greg_Surr/sounds/590153/ | venster 0.00–3.62 s, stilte-trim, gain +8.4 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-stoom.mp3` | Steam/hiss | wubitog | CC0 1.0 | https://freesound.org/people/wubitog/sounds/234782/ | venster 0.04–2.04 s, stilte-trim, gain -1.8 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `pakjeskamer-steekwagen.mp3` | Vehicle Wheels Trolley Large Short 1 | Sheyvan | CC0 1.0 | https://freesound.org/people/Sheyvan/sounds/570094/ | venster 0.19–2.32 s, stilte-trim, gain +14.4 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `pakjeskamer-blik.mp3` | tin_can1.wav | PhreaKsAccount | CC BY 3.0 | https://freesound.org/people/PhreaKsAccount/sounds/46276/ | venster 0.00–2.00 s, stilte-trim, gain +18.9 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-muis.mp3` | Mouse | AntumDeluge | CC0 1.0 | https://freesound.org/people/AntumDeluge/sounds/188043/ | venster 0.00–2.00 s, stilte-trim, gain +13.2 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-deegroller.mp3` | gegenereerd: “A heavy wooden rolling pin rolling back and forth over soft dough on a floured wooden table, three slow strokes with a soft thump at the end of each, clean and dry, no music, no reverb, no voices” | Higgsfield `mirelo_text_to_audio` (job `d3bb22b2-ec99-4da6-823b-fe3e36bc4a57`) | eigen gebruik, geen vermelding nodig | — | venster 0.00–2.63 s, stilte-trim, gain +8.0 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-bakplaat.mp3` | Oven door  | edhutschek | CC0 1.0 | https://freesound.org/people/edhutschek/sounds/214355/ | venster 0.27–6.09 s, stilte-trim, gain +11.0 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `bakkerij-meelzak.mp3` | Bag Of Flour Dropped On Counter Top.wav | bbrocer | CC0 1.0 | https://freesound.org/people/bbrocer/sounds/382642/ | venster 0.22–2.22 s, stilte-trim, gain +21.6 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-pot.mp3` | Opening & closing the lid on a glass jar 2 | randbsoundbites | CC0 1.0 | https://freesound.org/people/randbsoundbites/sounds/829763/ | venster 0.53–2.53 s, stilte-trim, gain +15.0 dB, limiter, fades, mono 44,1 kHz 128 kbps |
| `bakkerij-snurken.mp3` | SNORE-03_44100 | stevielematt | CC0 1.0 | https://freesound.org/people/stevielematt/sounds/760036/ | venster 0.14–7.35 s, stilte-trim, gain +9.3 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-papier.mp3` | tearing paper_03.wav | Dymewiz | CC BY 4.0 | https://freesound.org/people/Dymewiz/sounds/111107/ | venster 0.04–4.60 s, stilte-trim, gain +9.3 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-hond.mp3` | dog tripple bark | crazymonke9 | CC BY 4.0 | https://freesound.org/people/crazymonke9/sounds/418108/ | venster 0.00–2.00 s, stilte-trim, gain +5.1 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-klokslag.mp3` | clock chime.wav | speakingmusic | CC0 1.0 | https://freesound.org/people/speakingmusic/sounds/586631/ | venster 0.47–8.19 s, stilte-trim, gain +16.9 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-thee.mp3` | Cup Stir Making Tea.wav | Glitchedtones | CC0 1.0 | https://freesound.org/people/Glitchedtones/sounds/322393/ | venster 0.02–6.73 s, stilte-trim, gain +12.5 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-stoel.mp3` | Creaking Chair straining under stress long slow stress strain.wav | MattRuthSound | CC BY 4.0 | https://freesound.org/people/MattRuthSound/sounds/528986/ | venster 0.00–3.42 s, stilte-trim, gain +11.9 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `huiskamer-deur.mp3` | Squeaky door opened quickly.wav | CastIronCarousel | CC0 1.0 | https://freesound.org/people/CastIronCarousel/sounds/216878/ | venster 0.06–2.46 s, stilte-trim, gain +17.5 dB, limiter, fades, stereo 44,1 kHz 128 kbps |
| `stoomboot-fanfare.mp3` | Eigen synthese: tuba-oempa, grote trom en bekken in marstempo; de fanfare op het podium. | SoundScout (eigen werk) | eigen werk | — | 120 BPM, G-C-D-G, exact 352.800 samples, gain +2.1 dB |
| `dak-sluipen.mp3` | Eigen synthese: pizzicato-bas op de tellen, op de tenen; de robot met de contrabas op het dak. | SoundScout (eigen werk) | eigen werk | — | 120 BPM, G-C-D-G, exact 352.800 samples, gain +2.9 dB |
| `pakjeskamer-speeldoos.mp3` | Eigen synthese: speeldoos met een eigen melodie (geen bestaand lied); de speeldoos op de plank rechtsboven. | SoundScout (eigen werk) | eigen werk | — | 120 BPM, G-C-D-G, exact 352.800 samples, gain -4.0 dB |
| `bakkerij-ritme.mp3` | Eigen sequentie van CC0-slagen (pan, houtblok, blik); de robots die met lepels op pan, trommel en blik slaan. | SoundScout (eigen werk) | eigen werk | — | 120 BPM, G-C-D-G, exact 352.800 samples, gain +5.1 dB |
| `huiskamer-piano.mp3` | Eigen synthese: piano-oempa met de akkoorden G-C-D-G; de robot aan de piano. | SoundScout (eigen werk) | eigen werk | — | 120 BPM, G-C-D-G, exact 352.800 samples, gain -0.1 dB |

**Bouwstenen van `bakkerij-ritme.mp3`** (alle CC0):
- pan: pot2.wav — vacuumfan7072 — https://freesound.org/people/vacuumfan7072/sounds/505714/
- houtblok: Wood block hit — thomasjaunism — https://freesound.org/people/thomasjaunism/sounds/218460/
- blik: Hit to the can.wav — lmr9 — https://freesound.org/people/lmr9/sounds/178183/

**Muziek**: de vier andere loops (fanfare, sluipmuziek, speeldoos, piano) zijn volledig in
code gesynthetiseerd; de melodie van de speeldoos is nieuw geschreven, geen bestaand lied.
Alle vijf loops delen 120 BPM, G majeur en de akkoorden G | C | D | G, zodat elke
combinatie stapelt.
