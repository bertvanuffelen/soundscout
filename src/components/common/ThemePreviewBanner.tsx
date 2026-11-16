/**
 * Balk onderaan zolang er in dit tabblad een concept-thema als voorbeeld
 * openstaat ("Bekijk als leerling" in /beheer). Zonder voorbeeld rendert hij
 * niets, dus de gewone app ziet er precies hetzelfde uit.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { clearThemePreview, getThemePreview } from '../../themes/preview';

export function ThemePreviewBanner() {
  const { t } = useTranslation();
  const [preview] = useState(getThemePreview);
  if (!preview) return null;

  return (
    <div role="status" className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100vw-2rem)] flex flex-wrap items-center gap-2 rounded-full bg-brand-900 text-white shadow-lg px-4 py-1.5 text-sm font-bold">
      <Eye size={16} aria-hidden />
      <span>{t('admin.preview.banner')}: {preview.manifest.texts.nl.name} (v{preview.manifest.version})</span>
      <button type="button" className="min-h-11 px-3 rounded-full bg-accent-400 text-brand-900" onClick={() => { clearThemePreview(); window.location.assign('/beheer'); }}>
        {t('admin.preview.back')}
      </button>
      <button type="button" className="min-h-11 px-3 rounded-full text-brand-200 hover:bg-white/10" onClick={() => { clearThemePreview(); window.location.assign('/'); }}>
        {t('admin.preview.stop')}
      </button>
    </div>
  );
}

export default ThemePreviewBanner;
