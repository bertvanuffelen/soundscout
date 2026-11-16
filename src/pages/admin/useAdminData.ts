/**
 * Data van /beheer: de thema-lijst (database + statisch) in de query-cache,
 * plus de schrijfacties als mutaties die de lijst daarna verversen.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createDefaultStaticRepository } from '../../themes/registry';
import type { LoadedManifest } from '../../themes/repository';
import {
  AdminBackendMissingError,
  AdminRequestError,
  fetchAdminThemes,
  publishThemeVersion,
  rollbackTheme,
  updateThemeMeta,
  versionManifestUrl,
  type ThemeMetaPatch,
} from '../../lib/themeAdmin';
import { buildAdminRows, type AdminThemeRow } from '../../admin/overview';
import { useTeacherId, NO_USER } from '../../query/cache';
import { queryKeys } from '../../query/queryKeys';
import { logger } from '../../utils/logger';

export interface AdminData {
  rows: AdminThemeRow[];
  /** Migratie 043 ontbreekt: alleen lokaal werken. */
  backendMissing: boolean;
}

async function loadStatics(): Promise<LoadedManifest[]> {
  const repo = createDefaultStaticRepository();
  const summaries = await repo.listThemes().catch(() => []);
  const loaded = await Promise.all(summaries.map((s) => repo.getManifest(s.id).catch(() => null)));
  return loaded.filter((m): m is LoadedManifest => m !== null);
}

export function useAdminThemes() {
  const userId = useTeacherId();
  return useQuery({
    queryKey: queryKeys.teacher.adminThemes(userId ?? NO_USER),
    enabled: userId !== null,
    retry: false,
    queryFn: async (): Promise<AdminData> => {
      const [statics, db] = await Promise.all([
        loadStatics(),
        fetchAdminThemes().catch((error: unknown) => {
          if (error instanceof AdminBackendMissingError) return null;
          throw error;
        }),
      ]);
      return { rows: buildAdminRows(db, statics, versionManifestUrl), backendMissing: db === null };
    },
  });
}

/** Foutmelding voor de beheerder (vertaald). */
export function useAdminErrorText() {
  const { t } = useTranslation();
  return (error: unknown): string => {
    if (error instanceof AdminRequestError) {
      if (error.code === 'rateLimit') return t('admin.errors.rateLimit');
      if (error.code === 'forbidden') return t('admin.errors.forbidden');
      if (error.code === 'invalid') return t('admin.errors.invalid', { message: error.message });
    }
    return t('admin.errors.generic', { message: error instanceof Error ? error.message : String(error) });
  };
}

export function useAdminMutations() {
  const client = useQueryClient();
  const userId = useTeacherId();
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.teacher.adminThemes(userId ?? NO_USER) });
  const log = (what: string) => (error: unknown) => logger.error(`[beheer] ${what} mislukt`, error);

  return {
    refresh,
    publish: useMutation({ mutationFn: (v: { id: string; version: number }) => publishThemeVersion(v.id, v.version), onSuccess: refresh, onError: log('publiceren') }),
    rollback: useMutation({ mutationFn: (v: { id: string; version: number }) => rollbackTheme(v.id, v.version), onSuccess: refresh, onError: log('terugzetten') }),
    updateMeta: useMutation({
      mutationFn: (v: { id: string; patch: ThemeMetaPatch } | Array<{ id: string; patch: ThemeMetaPatch }>) =>
        Promise.all((Array.isArray(v) ? v : [v]).map((x) => updateThemeMeta(x.id, x.patch))),
      onSuccess: refresh,
      onError: log('bijwerken'),
    }),
  };
}
