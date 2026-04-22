/**
 * Storytelling utility functions (#41)
 *
 * Shared logic for storyboard image synchronization.
 * Used by StorytellingPanel (studio) and StorytellingDisplay (stage).
 */

/**
 * Determine which image to show based on currentBeat.
 * Uses sections if available, otherwise divides beats evenly.
 */
export function getActiveImageIndex(
  currentBeat: number,
  totalBeats: number,
  imageCount: number,
  sections: { endBeat: number }[],
): number {
  if (imageCount <= 1) return 0;

  // If sections match image count (1 section per slide) or image count - 1
  // (legacy: last slide has no section), use section boundaries
  if (sections.length === imageCount || sections.length === imageCount - 1) {
    for (let i = 0; i < sections.length; i++) {
      if (currentBeat < sections[i].endBeat) {
        return i;
      }
    }
    return imageCount - 1;
  }

  // Fallback: divide beats evenly
  const beatsPerImage = totalBeats / imageCount;
  const index = Math.floor(currentBeat / beatsPerImage);
  return Math.min(index, imageCount - 1);
}
