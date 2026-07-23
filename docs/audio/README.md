# docs/audio — alles over de audio-engine en exports

Alle documentatie over audio (Tone.js-engine, effecten, MP3-/video-export)
staat in deze map.

## Actueel (leidend)

| Bestand | Waarom je het leest |
|---|---|
| `PLAN-AUDIO-ENGINE-V2.md` | **Het actieve plan**: één gedeelde audio-motor voor live/preview/export, pitch-prebake (Signalsmith), deterministische reverb-IR's, export-validator + vangnet |
| `ONDERZOEK-EXPORT-EFFECTGLITCH.md` | Het onderzoek dat tot v2 leidde — §15 bevat de empirische bevindingen (12 Hz-PitchShift-vingerafdruk in Berts export) |
| `AUDIT-EXPORTS.md` | Exports-audit (17-7): 16 bevindingen + status; open punten worden in v2 meegenomen |
| `TONEJS-KENNISBANK.md` | Hard bevochten Tone.js-valkuilen — blijft geldig naslagwerk |

## `archief/` — verouderd, alleen historie

Plannen en prompts die al geïmplementeerd of achterhaald zijn
(PERF-1-refactor, clip-loop/effects, MP3-export-ontwerp, realtime-reschedule,
fades, oude audio-analyse-prompts en roadmaps). **Negeren bij nieuw werk** —
de actuele architectuurbeschrijving staat in `CLAUDE.md` en het v2-plan.
