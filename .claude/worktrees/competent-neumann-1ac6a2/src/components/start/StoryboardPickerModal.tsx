/**
 * StoryboardPickerModal — Picker voor compositie-afbeeldingen of storyboards
 * (#78). Vervangt de tweede stap in `ComposeModeScreen`.
 *
 * Toont alle beschikbare items over alle thema's heen in een platte grid.
 * Het thema (en dus de geluiden) volgt impliciet uit de gekozen storyboard,
 * dus de leerling hoeft niet apart een thema te kiezen.
 *
 * Variant `image`  → toont single-image storyboards (compositie-afbeeldingen)
 * Variant `storyboard` → toont multi-image storyboards
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Eye } from 'lucide-react';
import {
  getAllCompositionImages,
  getAllMultiImageStoryboards,
  type StoryboardWithTheme,
} from '../../data/themes';
import type { Storyboard } from '../../types';
import { StoryboardLightbox } from './StoryboardLightbox';

interface StoryboardPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'image' | 'storyboard';
  onSelect: (storyboard: Storyboard) => void;
  isLoading?: boolean;
}

export function StoryboardPickerModal({
  isOpen,
  onClose,
  variant,
  onSelect,
  isLoading = false,
}: StoryboardPickerModalProps) {
  const { t } = useTranslation();
  const [previewStoryboard, setPreviewStoryboard] = useState<Storyboard | null>(null);
  const items =
    variant === 'image' ? getAllCompositionImages() : getAllMultiImageStoryboards();

  if (!isOpen) return null;

  const titleKey = variant === 'image' ? 'composeMode.pickImage' : 'composeMode.pickStoryboard';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200">
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">{t(titleKey)}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
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
        </div>
      </div>

      {/* Lightbox voor storyboard-preview (#78) */}
      <StoryboardLightbox
        isOpen={previewStoryboard !== null}
        onClose={() => setPreviewStoryboard(null)}
        storyboard={previewStoryboard}
      />
    </div>
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
  // <button> binnen <button> wordt. De select-actie zit op een interne button
  // die het grootste deel van de kaart vult.
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

      {/* Preview-knop: de count-badge is zelf klikbaar (#78).
          Alleen tonen bij storyboards met >1 afbeelding. */}
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
