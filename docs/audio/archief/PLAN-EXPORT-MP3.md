# Plan: Audio Export (MP3/WAV)

**Laatst bijgewerkt**: 01-02-2025
**Status**: Research voltooid, klaar voor implementatie
**Prioriteit**: 🔴 P1

---

## 1. Overzicht

### Doel
Gebruikers kunnen hun compositie downloaden als MP3 bestand om te delen of te bewaren.

### Gebruikersverhaal
> Als gebruiker wil ik mijn compositie kunnen downloaden als audio bestand, zodat ik het kan delen met vrienden/familie of bewaren op mijn computer.

### Acceptatiecriteria
- [ ] "Download" knop zichtbaar in Club-scherm
- [ ] Klik genereert MP3 bestand van de compositie
- [ ] Bestandsnaam is `{compositie-naam}.mp3`
- [ ] Kwaliteit: 128kbps stereo
- [ ] Werkt in Chrome, Firefox, Safari, Edge
- [ ] Loading indicator tijdens rendering
- [ ] Foutmelding bij problemen

---

## 2. Technisch Onderzoek

### 2.1 Twee Benaderingen

| Benadering | Beschrijving | Voordelen | Nadelen |
|------------|--------------|-----------|---------|
| **A: Tone.Offline** | Render timeline offline naar AudioBuffer | Sneller dan realtime, sample-accurate | Complexe setup met preloaded buffers |
| **B: Tone.Recorder** | Real-time opname via MediaRecorder API | Simpeler implementatie | Duurt zo lang als compositie, WebM output |

**Gekozen: Benadering A (Tone.Offline)** - Betere kwaliteit en snellere export.

### 2.2 Export Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│  Timeline   │───▶│ Tone.Offline │───▶│ AudioBuffer │───▶│ WAV/MP3  │
│  (clips)    │    │  rendering   │    │             │    │  Blob    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          │                                       │
                    ┌─────▼─────┐                           ┌─────▼─────┐
                    │ WAV Export │                           │ MP3 Export│
                    │ (simpel)   │                           │ (lamejs)  │
                    └───────────┘                           └───────────┘
```

### 2.3 Dependencies

| Package | Versie | Doel | NPM |
|---------|--------|------|-----|
| `audiobuffer-to-wav` | ^1.0.0 | AudioBuffer → WAV | [link](https://www.npmjs.com/package/audiobuffer-to-wav) |
| `lamejs` | ^1.2.1 | WAV → MP3 encoding | [link](https://www.npmjs.com/package/lamejs) |

**Tone.js** is al geïnstalleerd en ondersteunt `Tone.Offline` en `Tone.OfflineContext`.

---

## 3. Implementatie Strategie

### 3.1 Fase 1: WAV Export (Simpeler, eerst implementeren)

WAV export is eenvoudiger en een goede eerste stap:

```typescript
// src/utils/audioExport.ts

import * as Tone from 'tone';
import toWav from 'audiobuffer-to-wav';

interface ExportOptions {
  sampleRate?: number;  // default: 44100
  channels?: number;    // default: 2 (stereo)
}

export async function exportToWav(
  tracks: Track[],
  samples: Sample[],
  duration: number,
  options: ExportOptions = {}
): Promise<Blob> {
  const { sampleRate = 44100, channels = 2 } = options;

  // Stap 1: Preload alle benodigde buffers
  const bufferMap = await preloadBuffers(samples);

  // Stap 2: Render offline
  const offlineContext = new Tone.OfflineContext(channels, duration, sampleRate);

  // Stap 3: Schedule alle clips
  scheduleClipsToContext(tracks, bufferMap, offlineContext);

  // Stap 4: Render naar buffer
  const renderedBuffer = await offlineContext.render();

  // Stap 5: Convert naar WAV
  const wavArrayBuffer = toWav(renderedBuffer);

  return new Blob([wavArrayBuffer], { type: 'audio/wav' });
}
```

### 3.2 Fase 2: MP3 Export (Na WAV werkt)

MP3 encoding met lamejs:

```typescript
// src/utils/audioExport.ts (uitbreiding)

import * as lamejs from 'lamejs';

export async function exportToMp3(
  tracks: Track[],
  samples: Sample[],
  duration: number,
  options: { bitrate?: number } = {}
): Promise<Blob> {
  const { bitrate = 128 } = options;

  // Eerst renderen naar AudioBuffer
  const audioBuffer = await renderOffline(tracks, samples, duration);

  // Convert naar MP3
  const mp3Blob = encodeToMp3(audioBuffer, bitrate);

  return mp3Blob;
}

function encodeToMp3(audioBuffer: AudioBuffer, kbps: number): Blob {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;

  // Lamejs encoder setup
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Int8Array[] = [];

  // Haal channel data op
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = channels > 1
    ? audioBuffer.getChannelData(1)
    : leftChannel;

  // Convert Float32 naar Int16
  const leftInt16 = floatTo16BitPCM(leftChannel);
  const rightInt16 = floatTo16BitPCM(rightChannel);

  // Encode in chunks (1152 samples per MP3 frame)
  const blockSize = 1152;
  for (let i = 0; i < samples; i += blockSize) {
    const leftChunk = leftInt16.subarray(i, i + blockSize);
    const rightChunk = rightInt16.subarray(i, i + blockSize);

    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf));
    }
  }

  // Flush remaining data
  const mp3End = encoder.flush();
  if (mp3End.length > 0) {
    mp3Data.push(new Int8Array(mp3End));
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}
```

### 3.3 Kritiek: Preloading Buffers voor Offline Rendering

Het belangrijkste probleem met `Tone.Offline` is dat samples BUITEN de callback moeten worden geladen. Onze huidige architectuur laadt samples al via `useAudioEngine` - we kunnen deze hergebruiken.

```typescript
// Hergebruik bestaande geladen buffers
async function preloadBuffers(samples: Sample[]): Promise<Map<string, Tone.ToneAudioBuffer>> {
  const bufferMap = new Map<string, Tone.ToneAudioBuffer>();

  await Promise.all(
    samples.map(async (sample) => {
      const buffer = new Tone.ToneAudioBuffer();
      await buffer.load(sample.audioUrl);
      bufferMap.set(sample.id, buffer);
    })
  );

  return bufferMap;
}

function scheduleClipsToContext(
  tracks: Track[],
  bufferMap: Map<string, Tone.ToneAudioBuffer>,
  context: Tone.OfflineContext
): void {
  const bpm = 120; // Hardcoded in onze app
  const transport = context.transport;
  transport.bpm.value = bpm;

  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const buffer = bufferMap.get(clip.sampleId);
      if (!buffer) return;

      // Maak player met de offline context
      const player = new Tone.Player({
        url: buffer,
        context: context as unknown as Tone.BaseContext,
      }).toDestination();

      // Schedule op transport
      const startTime = Tone.Time(`${clip.startBeat}:0:0`).toSeconds();
      transport.schedule((time) => {
        player.start(time);
      }, startTime);
    });
  });

  // Start transport
  transport.start(0);
}
```

---

## 4. UI Implementatie

### 4.1 ClubView Aanpassingen

```tsx
// In ClubView.tsx

import { Download, Loader2 } from 'lucide-react';

const [isExporting, setIsExporting] = useState(false);
const [exportError, setExportError] = useState<string | null>(null);

const handleExport = async () => {
  setIsExporting(true);
  setExportError(null);

  try {
    const blob = await exportToMp3(tracks, librarySamples, duration);

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${compositionName || 'mijn-compositie'}.mp3`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    setExportError('Er ging iets mis bij het exporteren. Probeer opnieuw.');
    console.error('Export failed:', error);
  } finally {
    setIsExporting(false);
  }
};

// In render:
<Button
  variant="secondary"
  onClick={handleExport}
  disabled={isExporting || !hasClips}
>
  {isExporting ? (
    <>
      <Loader2 size={16} className="mr-1 animate-spin" />
      {t('club.exporting')}
    </>
  ) : (
    <>
      <Download size={16} className="mr-1" />
      {t('club.download')}
    </>
  )}
</Button>
```

### 4.2 i18n Toevoegingen

```json
// nl.json
{
  "club": {
    "download": "Download MP3",
    "exporting": "Exporteren...",
    "exportError": "Export mislukt. Probeer opnieuw."
  }
}

// en.json
{
  "club": {
    "download": "Download MP3",
    "exporting": "Exporting...",
    "exportError": "Export failed. Please try again."
  }
}
```

---

## 5. Bestandsstructuur

```
src/
├── utils/
│   └── audioExport.ts          # Export functies (nieuw)
├── hooks/
│   └── useAudioExport.ts       # React hook wrapper (nieuw)
├── components/
│   └── club/
│       └── ClubView.tsx        # Download knop toevoegen
└── i18n/
    └── locales/
        ├── nl.json             # Export strings
        └── en.json             # Export strings
```

---

## 6. Edge Cases & Error Handling

| Scenario | Afhandeling |
|----------|-------------|
| Geen clips op timeline | Download knop disabled |
| Sample niet geladen | Skip clip, warn in console |
| Browser ondersteunt geen OfflineContext | Fallback naar Tone.Recorder (WebM) |
| Export duurt lang (>10s compositie) | Progress indicator tonen |
| Geheugen limiet bereikt | Foutmelding, suggest kortere compositie |
| iOS Safari beperkingen | OfflineContext moet na user gesture |

---

## 7. Performance Overwegingen

### Rendering Snelheid
- `Tone.Offline` rendert sneller dan realtime (vaak 10-20x)
- 30 seconden compositie → ~2-3 seconden rendering

### Memory Management
- AudioBuffer in memory: ~10MB per minuut (44.1kHz stereo)
- Release buffers na export via `URL.revokeObjectURL()`
- Overweeg streaming voor zeer lange composities

### Bundle Size Impact
| Package | Grootte (minified) |
|---------|-------------------|
| lamejs | ~150KB |
| audiobuffer-to-wav | ~3KB |

---

## 8. Implementatie Volgorde

### Stap 1: Setup (30 min)
- [ ] Installeer dependencies: `npm install audiobuffer-to-wav lamejs`
- [ ] Maak `src/utils/audioExport.ts`
- [ ] Voeg TypeScript types toe voor lamejs

### Stap 2: WAV Export (2 uur)
- [ ] Implementeer `renderOffline()` functie
- [ ] Implementeer `exportToWav()` functie
- [ ] Test met simpele compositie

### Stap 3: MP3 Encoding (1.5 uur)
- [ ] Implementeer `encodeToMp3()` functie
- [ ] Test encoding kwaliteit
- [ ] Optimaliseer chunk size indien nodig

### Stap 4: UI Integratie (1 uur)
- [ ] Voeg Download knop toe aan ClubView
- [ ] Voeg loading state toe
- [ ] Voeg error handling toe
- [ ] Update i18n

### Stap 5: Testing (1 uur)
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test met verschillende compositie lengtes
- [ ] Test met lege timeline (moet disabled zijn)
- [ ] Test error scenarios

---

## 9. Bronnen & Referenties

### Officiële Documentatie
- [Tone.js Offline API](https://tonejs.github.io/docs/14.7.58/fn/Offline)
- [Tone.js OfflineContext](https://tonejs.github.io/docs/15.0.4/classes/OfflineContext.html)
- [Web Audio API OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)

### NPM Packages
- [audiobuffer-to-wav](https://www.npmjs.com/package/audiobuffer-to-wav) - AudioBuffer naar WAV
- [lamejs](https://www.npmjs.com/package/lamejs) - MP3 encoder in JavaScript

### GitHub Repositories
- [Tone.js](https://github.com/Tonejs/Tone.js) - Web Audio framework
- [Experience-Monks/audiobuffer-to-wav](https://github.com/Experience-Monks/audiobuffer-to-wav) - WAV encoder
- [zhuker/lamejs](https://github.com/zhuker/lamejs) - LAME MP3 encoder port

### Community Discussies
- [Tone.Offline with Samples - Issue #368](https://github.com/Tonejs/Tone.js/issues/368)
- [Recording and exporting web audio](https://medium.com/creative-technology-concepts-code/recording-syncing-and-exporting-web-audio-1e1a1e35ef08)

---

## 10. Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| iOS Safari OfflineContext beperkingen | Medium | Trigger na expliciete user click |
| Lamejs bundle size (150KB) | Laag | Lazy load module |
| Preloading buffers duurt lang | Laag | Hergebruik al geladen samples |
| Memory issues bij lange composities | Medium | Limiet op compositie lengte (60s) |

---

## 11. Volgende Stappen

Na goedkeuring van dit plan:

1. **Start implementatie** met WAV export (simpeler, sneller te testen)
2. **Voeg MP3 encoding toe** zodra WAV werkt
3. **Integreer in UI** met loading states
4. **Test cross-browser** compatibility
5. **Update documentatie** met export instructies

---

*Dit document is gebaseerd op uitgebreid onderzoek naar Tone.js offline rendering, Web Audio API, en JavaScript audio encoding libraries.*
