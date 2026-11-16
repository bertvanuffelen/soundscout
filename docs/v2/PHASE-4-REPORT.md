# V2 Phase 4 — Sound Lab and tempo

> Status: **implemented** (16-11-2026). All automated gates pass, including the export validator on every new kind of sound. **Nothing has been listened to yet**: stretched loops, the new effects and the synth voices are checked by measurement only.

## What was built

| Part | Result |
|---|---|
| Vervormen | The clip effects window became **Vervormen**: "Klank" (pitch, reverb, fade in/out) plus "Vervormen" (speed ½×–2×, reverse, echo, filter). Opens only from a placed clip. Preview uses the same engine as export. Not a separate screen; "shape a tone" is not built (Correction E). |
| Tempo | Per composition: Traag 90 · Rustig 105 · Normaal 120 · Snel 135 (default 120), in a menu at the right of the transport bar. Music loops are time-stretched to keep their length in beats (pre-baked with Signalsmith, cached per sound + tempo); sound effects keep their length in seconds. |
| Melodie | A **Melodie** tab next to **Ritme** in the fixed sequencer panel. Pentatonic grid (1–3 octaves), voice = three synth voices (Warm, Helder, Tokkel) or a sound from the child's library, swing, loudness per note. |
| Engine | One bake service for pitch, stretch, speed and reverse; echo and filter in the shared chain; tempo used everywhere a beat is converted to time (live, seek, export, video, presentation, sequencer, playback clock). |

All transformations are stored as parameters on the clip or sequence and rendered the same way live, in preview and in export.

## Gates

| Gate | Result |
|---|---|
| `npx tsc -b` | clean |
| Unit tests | 1001 pass |
| `npm run e2e` | 103 pass |
| `npm run e2e:sw` | 9 pass |
| Golden audio | the 4 existing renders are bit-identical; 5 new ones (tempo 90, tempo 135, Vervormen, melody with a library sound, melody with synth) pass the export validator without the realtime fallback |
| Lint | 23 pre-existing errors; none in new code |

## Decisions made along the way (check these)

- **Which sounds are loops.** The six music-shop sounds in `basis` (drums, brass, bass, guitar, strings, piano) and, confirmed by Bert on 16-11-2026, three pirate sounds: `grogkroeg-accordeon`, `schip-zeemanslied`, `jungle-trommels`. Marking a loop is one field in the theme manifest (`kind: "loop"`).
- **Overlap after a tempo change.** Clips are never moved. A faster tempo makes sound effects longer in beats, so they can overlap; overlapping clips get a dashed red outline. Switching back restores the original arrangement exactly, and one undo restores tempo and positions together.
- **Templates lock the tempo** when the template has locked clips.
- **Changing a filled sequence between Ritme and Melodie** creates a new sequence instead of converting it; nothing is lost.
- **Loudness per melody note** is set with a three-way brush (Hard / Middel / Zacht) instead of long-press, so it works the same with mouse, touch and keyboard.
- **Speed and pitch multiply:** speed 2 is an octave higher on top of any pitch setting.

## Things to know

- **When a stretch cannot be prepared in time** (or the stretch component is unavailable on a device), a loop plays at the right length but with a pitch shift: about 5 semitones lower at 90 BPM. Exports always wait for the stretch.
- **Reverb and echo tails now ring out during live playback**, as they already did in the export; before, the live reverb tail was cut off.
- **"Unsaved work" and the hand-in check now notice a tempo-only change** (only when the tempo is not 120, so existing fingerprints are unchanged).
- **Fixed in passing:** a change to only speed, reverse, echo or filter was not an undo step.

## Not done

| Item | Note |
|---|---|
| Listening | Stretched loops (especially 90 BPM), speed 2, echo/filter, synth voices and pitched library voices. |
| Note length in Melodie | All notes are one step long. |
| Swing and loudness in Ritme | Supported by the engine, not shown in the Ritme screen. |
| Tempo picker while the sequencer is open | Stays visible; whether it should hide is a design question. |
| iPad / Chromebook | Touch dragging of fade handles, the melody grid, and stretch performance on slow devices. |
| Sequencer memory | The sequencer keeps its own copy of its sounds outside the memory budget (from Phase 3). |

## To check by ear and by hand

- [ ] A music-shop loop at 90, 105, 120 and 135: same length in beats, no audible artefacts, no pitch change.
- [ ] A sound effect at 135: it sounds the same, only takes more space on the timeline.
- [ ] Vervormen on a few sounds: preview and the exported MP3 sound the same.
- [ ] A melody with each synth voice and with a library sound; swing audible; loud/medium/soft audible.
- [ ] Change tempo during playback: the playhead stays on the same beat, nothing glitches.
- [ ] On an iPad: open Vervormen, drag a fade handle, place melody notes.
