/**
 * useAssignmentSources — de bronnen per opdrachtvorm (platen, verhalen,
 * templates, thema's) als één lijst met naam + beeld. Gedeeld door de
 * opdracht-wizard en de leskaart-editor, zodat beide hetzelfde raster tonen.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTemplates } from '../../../hooks/useTemplates';
import type { AssignmentType } from '../../../lib/assignments';
import { getAllMultiImageStoryboards, getTeacherThemes, getMapBackgroundImage } from '../../../data/themes';
import { getPraatplaatCatalog } from '../../../data/praatplaatCatalog';

// App-content (registry/catalogus): voor elke docent hetzelfde
const storyboards = getAllMultiImageStoryboards();
const praatplaatCatalog = getPraatplaatCatalog();
const assignableThemes = getTeacherThemes();

export interface SourceItem {
  id: string;
  name: string;
  imageUrl: string | null;
  sub?: string;
  /** Thema voor de seizoensbadge */
  themeId?: string | null;
}

export function useAssignmentSources() {
  const { t, i18n } = useTranslation();
  const { templates, loading: templatesLoading } = useTemplates();

  const sourcesFor = useCallback((type: AssignmentType): SourceItem[] => {
    switch (type) {
      case 'praatplaat':
        return praatplaatCatalog.map((e) => ({ id: e.ref, name: t(e.nameKey), imageUrl: e.imageUrl, themeId: e.themeId }));
      case 'storyboard':
        return storyboards.map((sb) => ({
          id: sb.storyboard.id, name: t(sb.storyboard.name), imageUrl: sb.storyboard.coverImage,
          sub: t('teacher.wizard.storyboardScenes', { count: sb.storyboard.images.length }), themeId: sb.themeId,
        }));
      case 'template':
        return templates.filter((tm) => tm.isActive).map((tm) => ({ id: tm.id, name: tm.name, imageUrl: null, sub: tm.description || undefined }));
      case 'free':
        return assignableThemes.map((th) => ({
          id: th.id, name: t(th.name), imageUrl: getMapBackgroundImage(th.map, i18n.language), themeId: th.id,
        }));
    }
  }, [t, i18n.language, templates]);

  return { sourcesFor, templatesLoading };
}
