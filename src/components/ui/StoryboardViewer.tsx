/**
 * StoryboardViewer - Standalone storyboard image display (#49)
 *
 * Props-driven component for displaying storyboard images synced to a beat position.
 * Used in read-only contexts: SubmissionPlayer (teacher dashboard) and SharedPlayer.
 *
 * Unlike StorytellingDisplay (which reads from appStore/audioStore),
 * this component is fully controlled via props — no store dependencies.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomIn } from 'lucide-react';
import type { Storyboard, Section } from '../../types';
import { getActiveImageIndex } from '../../utils/storytelling';
import { ImageLightbox } from './ImageLightbox';
import { CrossfadeImage } from './CrossfadeImage';

interface StoryboardViewerProps {
  storyboard: Storyboard;
  currentBeat: number;
  totalBeats: number;
  sections: Section[];
  /** Optional: compact layout for side-by-side with timeline */
  compact?: boolean;
  /**
   * Vul de volledige beschikbare hoogte (presentatiescherm/digibord) —
   * het beeld schaalt mee met de container i.p.v. de max-w-sm/lg-cap.
   */
  fill?: boolean;
  /** Optional transport controls for lightbox */
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onStop?: () => void;
}

export function StoryboardViewer({
  storyboard,
  currentBeat,
  totalBeats,
  sections,
  compact = false,
  fill = false,
  isPlaying,
  onPlayPause,
  onStop,
}: StoryboardViewerProps) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imageCount = storyboard.images.length;

  const displayIndex = useMemo(
    () => getActiveImageIndex(currentBeat, totalBeats, imageCount, sections),
    [currentBeat, totalBeats, imageCount, sections],
  );

  const currentImage = storyboard.images[displayIndex];
  if (!currentImage) return null;

  return (
    <div
      className={
        fill
          ? 'h-full w-full min-h-0 flex flex-col items-center justify-center p-2'
          : `flex flex-col items-center ${compact ? 'p-2' : 'p-3 sm:p-4'}`
      }
    >
      {/* Image — fill: schaal mee met de beschikbare hoogte (digibord) */}
      <div
        className={`relative rounded-xl overflow-hidden bg-black/10 shadow-md ${
          fill ? 'h-full aspect-video max-w-full' : `w-full ${compact ? 'max-w-sm' : 'max-w-lg'}`
        }`}
      >
        <CrossfadeImage
          src={currentImage.url}
          alt={t(currentImage.label)}
          containerClassName={fill ? 'w-full h-full' : undefined}
          className={fill ? 'w-full h-full object-cover' : 'w-full aspect-video object-cover'}
        />

        {/* Zoom button overlay */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          aria-label={t('common.zoom')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Label + position indicator overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold drop-shadow-md">
              {t(currentImage.label)}
            </span>
            {imageCount > 1 && (
              <span className="text-white/80 text-xs drop-shadow-md">
                {displayIndex + 1} / {imageCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          src={currentImage.url}
          alt={t(currentImage.label)}
          onClose={() => setLightboxOpen(false)}
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onStop={onStop}
        />
      )}
    </div>
  );
}
