/**
 * StoryboardPicker — presentational grid van compositie-afbeeldingen of
 * storyboards, met interne lightbox-preview.
 *
 * Geëxtraheerd uit de oude StoryboardPickerModal zodat de "Nieuwe compositie"-
 * wizard dit als stap 2 kan tonen, zonder eigen modal-chrome.
 *
 * Variant `image`      → single-image storyboards (compositie-afbeeldingen)
 * Variant `storyboard` → multi-image storyboards
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Eye } from 'lucide-react';
import {
  getAllCompositionImages,
  getAllMultiImageStoryboards,
  type StoryboardWithTheme,
} from '../../data/themes';
import type { Storyboard } from '../../types';
import { StoryboardLightbox } from './StoryboardLightbox';

interface StoryboardPickerProps {
  variant: 'image' | 'storyboard';
  onSelect: (storyboard: Storyboard) => void;
  isLoading?: boolean;
}

export function StoryboardPicker({ variant, onSelect, isLoading = false }: StoryboardPickerProps) {
  const { t } = useTranslation();
  const [previewStoryboard, setPreviewStoryboard] = useState<Storyboard | null>(null);
  const items =
    variant === 'image' ? getAllCompositionImages() : getAllMultiImageStoryboards();

  return (
    <>
      {items.length === 0 ? (
        <p className="text-text-muted text-center py-8">
          {variant === 'image'
            ? t('composeMode.noImages', 'Er zijn nog geen compositie-afbeeldingen beschikbaar.')
            : t('composeMode.noStoryboards', 'Er zijn nog geen storyboards beschikbaar.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {items.map(({ themeId, themeName, storyboard }) => (
            <PickerCard
              key={`${themeId}-${storyboard.id}`}
              themeName={themeName}
              storyboard={storyboard}
              onSelect={() => onSelect(storyboard)}
              onPreview={() => setPreviewStoryboard(storyboard)}
              isLoading={isLoading}
              showCount={variant === 'storyboard'}
            />
          ))}
        </div>
      )}

      {/* Lightbox voor storyboard-preview (#78) */}
      <StoryboardLightbox
        isOpen={previewStoryboard !== null}
        onClose={() => setPreviewStoryboard(null)}
        storyboard={previewStoryboard}
      />
    </>
  );
}

interface PickerCardProps {
  themeName: string;
  storyboard: StoryboardWithTheme['storyboard'];
  onSelect: () => void;
  onPreview: () => void;
  isLoading: boolean;
  showCount: boolean;
}

function PickerCard({ themeName, storyboard, onSelect, onPreview, isLoading, showCount }: PickerCardProps) {
  const { t } = useTranslation();
  const hasMultipleImages = storyboard.images.length > 1;

  // Card = wrapper-div zodat de preview-knop (op de badge) geen geneste
  // <button> binnen <button> wordt.
  return (
    <div className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
      <button
        type="button"
        onClick={onSelect}
        disabled={isLoading}
        className="block w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="aspect-video w-full overflow-hidden bg-neutral-100 relative">
          <img
            src={storyboard.coverImage}
            alt={t(storyboard.name)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="p-3 sm:p-4">
          <h3 className="text-base font-bold text-text-main mb-0.5 truncate">
            {t(storyboard.name)}
          </h3>
          <p className="text-xs text-text-muted truncate">{t(themeName)}</p>
        </div>

        {/* Hover-overlay met "Kiezen". `pointer-events-none` zodat de
            preview-badge erboven wél klikbaar blijft. */}
        <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <span className="bg-brand-700 text-white px-4 py-1.5 rounded-full font-semibold text-sm shadow-lg flex items-center gap-1.5">
            <Check size={14} />
            {t('themeSelection.select')}
          </span>
        </div>
      </button>

      {/* Preview-knop: de count-badge is zelf klikbaar. Alleen bij >1 afbeelding. */}
      {showCount && hasMultipleImages && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="absolute top-2 right-2 bg-brand-900/70 hover:bg-brand-900/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors shadow-sm"
          aria-label={t('storyboardLightbox.openPreview')}
        >
          <Eye size={12} />
          {t('composeMode.images', { count: storyboard.images.length })}
        </button>
      )}
    </div>
  );
}

export default StoryboardPicker;
