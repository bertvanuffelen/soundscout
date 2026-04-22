/**
 * Canvas Frame Renderer — Video Export
 *
 * Standalone canvas-renderer (geen React-dependency) die storyboard-afbeeldingen
 * tekent op een canvas context, inclusief crossfade-transities.
 *
 * Gebruikt door beide video export engines (WebCodecs en MediaRecorder).
 */

import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface ImageSegment {
  /** Pad naar de afbeelding (relatief aan public root) */
  url: string;
  /** Starttijd in seconden */
  startTime: number;
  /** Eindtijd in seconden */
  endTime: number;
}

// =============================================================================
// Image Preloading
// =============================================================================

/**
 * Laad alle unieke afbeeldingen als ImageBitmap voor snelle canvas rendering.
 * Parallel fetch + createImageBitmap.
 */
export async function preloadImages(
  urls: string[],
): Promise<Map<string, ImageBitmap>> {
  const unique = [...new Set(urls)];
  const cache = new Map<string, ImageBitmap>();

  await Promise.all(
    unique.map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        cache.set(url, bitmap);
      } catch (err) {
        logger.warn(`[canvasFrameRenderer] Failed to preload image: ${url}`, err);
      }
    }),
  );

  return cache;
}

// =============================================================================
// Frame Rendering
// =============================================================================

/**
 * Teken één frame op de canvas context op basis van het huidige tijdstip.
 *
 * Logica:
 * 1. Bepaal welk ImageSegment actief is op `currentTime`
 * 2. Check of we in de crossfade-zone zitten (laatste `crossfadeDuration` seconden)
 * 3. Zo ja: blend huidige en volgende afbeelding via globalAlpha
 * 4. Zo nee: teken alleen huidige afbeelding
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  currentTime: number,
  imageTimeline: ImageSegment[],
  imageCache: Map<string, ImageBitmap>,
  width: number,
  height: number,
  crossfadeDuration: number = 0.5,
): void {
  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (imageTimeline.length === 0) return;

  // Zoek het actieve segment
  let activeIndex = 0;
  for (let i = 0; i < imageTimeline.length; i++) {
    if (currentTime < imageTimeline[i].endTime) {
      activeIndex = i;
      break;
    }
    // Als voorbij het laatste segment, gebruik het laatste
    if (i === imageTimeline.length - 1) {
      activeIndex = i;
    }
  }

  const activeSegment = imageTimeline[activeIndex];
  const nextSegment =
    activeIndex < imageTimeline.length - 1
      ? imageTimeline[activeIndex + 1]
      : null;

  // Bereken crossfade progress
  const crossfadeStart = activeSegment.endTime - crossfadeDuration;
  let fadeProgress = 0;

  if (nextSegment && currentTime >= crossfadeStart && currentTime < activeSegment.endTime) {
    fadeProgress = (currentTime - crossfadeStart) / crossfadeDuration;
    fadeProgress = Math.max(0, Math.min(1, fadeProgress));
  }

  // Teken huidige afbeelding
  const currentBitmap = imageCache.get(activeSegment.url);
  if (currentBitmap) {
    if (fadeProgress > 0) {
      ctx.globalAlpha = 1 - fadeProgress;
    } else {
      ctx.globalAlpha = 1;
    }
    drawImageCover(ctx, currentBitmap, width, height);
  }

  // Teken volgende afbeelding (crossfade)
  if (fadeProgress > 0 && nextSegment) {
    const nextBitmap = imageCache.get(nextSegment.url);
    if (nextBitmap) {
      ctx.globalAlpha = fadeProgress;
      drawImageCover(ctx, nextBitmap, width, height);
    }
  }

  // Reset alpha
  ctx.globalAlpha = 1;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Teken een ImageBitmap op het canvas met object-cover scaling.
 * Vult het volledige canvas terwijl de aspect ratio behouden blijft (crop overschot).
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const srcAspect = bitmap.width / bitmap.height;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (srcAspect > canvasAspect) {
    // Afbeelding is breder: schaal op hoogte, crop links/rechts
    drawWidth = canvasHeight * srcAspect;
    offsetX = (canvasWidth - drawWidth) / 2;
  } else {
    // Afbeelding is hoger: schaal op breedte, crop boven/onder
    drawHeight = canvasWidth / srcAspect;
    offsetY = (canvasHeight - drawHeight) / 2;
  }

  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * Bereken ImageSegments uit storyboard-afbeeldingen en sections.
 * Hergebruikt dezelfde logica als getActiveImageIndex() uit storytelling.ts.
 */
export function computeImageTimeline(
  imageUrls: string[],
  totalBeats: number,
  sections: { endBeat: number }[],
  bpm: number,
): ImageSegment[] {
  const imageCount = imageUrls.length;
  if (imageCount === 0) return [];

  const beatsToSec = (beats: number) => (beats / bpm) * 60;
  const totalDuration = beatsToSec(totalBeats);

  if (imageCount === 1) {
    return [{ url: imageUrls[0], startTime: 0, endTime: totalDuration }];
  }

  const segments: ImageSegment[] = [];

  // Gebruik sections als ze matchen met imageCount (zelfde logica als getActiveImageIndex)
  if (sections.length === imageCount || sections.length === imageCount - 1) {
    let prevEndBeat = 0;
    for (let i = 0; i < imageCount; i++) {
      const endBeat =
        i < sections.length ? sections[i].endBeat : totalBeats;
      segments.push({
        url: imageUrls[i],
        startTime: beatsToSec(prevEndBeat),
        endTime: beatsToSec(endBeat),
      });
      prevEndBeat = endBeat;
    }
  } else {
    // Fallback: verdeel beats gelijkmatig
    const beatsPerImage = totalBeats / imageCount;
    for (let i = 0; i < imageCount; i++) {
      const startBeat = i * beatsPerImage;
      const endBeat = i === imageCount - 1 ? totalBeats : (i + 1) * beatsPerImage;
      segments.push({
        url: imageUrls[i],
        startTime: beatsToSec(startBeat),
        endTime: beatsToSec(endBeat),
      });
    }
  }

  return segments;
}
