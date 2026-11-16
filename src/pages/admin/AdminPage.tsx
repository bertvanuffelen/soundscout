/**
 * /beheer — het beheerdersdashboard (V2 Fase 3, docs/v2/ADMIN-DASHBOARD.md).
 *
 * Eigen lazy chunk, buiten de app-layout (geen thema/audio-opstart), met
 * dezelfde QueryClient en AuthProvider als de rest. Toegang:
 *   niet ingelogd → docent-login; ingelogd zonder beheerdersrecht → "geen toegang".
 * Die check is alleen voor de interface: elke schrijfactie wordt door RLS in
 * de database bewaakt (migratie 043).
 */

import { useEffect, useReducer, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { BarChart3, LogOut, Palette, PencilRuler, Upload } from 'lucide-react';
import { AuthProvider } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts/useAuth';
import { queryClient } from '../../query/queryClient';
import { QueryAuthSync } from '../../query/QueryAuthSync';
import { TeacherLogin } from '../../components/teacher/TeacherLogin';
import { UsageStatsContent } from '../../components/teacher/UsageStatsPanel';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { Button } from '../../components/ui/Button';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { signOut } from '../../lib/auth';
import { cn } from '../../utils/cn';
import { setThemePreview } from '../../themes/preview';
import { createDraft, editorReducer, type Draft, type EditorAction } from '../../admin/editorState';
import type { AdminThemeRow } from '../../admin/overview';
import { useAdminThemes } from './useAdminData';
import { ThemesSection } from './ThemesSection';
import { EditorSection } from './EditorSection';
import { ImportSection } from './ImportSection';
import { Notice } from './parts';

type Section = 'themes' | 'editor' | 'import' | 'stats';

type DraftAction = EditorAction | { type: 'load'; draft: Draft | null };

function draftReducer(state: Draft | null, action: DraftAction): Draft | null {
  if (action.type === 'load') return action.draft;
  return state ? editorReducer(state, action) : state;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-bg-app flex items-center justify-center p-4">{children}</div>;
}

function Dashboard({ fallback }: { fallback: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('themes');
  const [draft, dispatch] = useReducer(draftReducer, null);
  const query = useAdminThemes();
  const rows = query.data?.rows ?? [];
  const backendMissing = query.data?.backendMissing ?? false;

  const openRow = (row: AdminThemeRow) => {
    dispatch({ type: 'load', draft: createDraft(row.latest.manifest, row.latest.url, row.source === 'database' ? row.latest.version : null) });
    setSection('editor');
  };
  const preview = (d: Draft) => {
    setThemePreview({ manifest: { ...d.manifest, status: 'published' }, url: d.sourceUrl });
    window.location.assign(`/?theme=${encodeURIComponent(d.themeId)}`);
  };

  const NAV: Array<[Section, string, typeof Palette]> = [
    ['themes', t('admin.nav.themes'), Palette],
    ['editor', t('admin.nav.editor'), PencilRuler],
    ['import', t('admin.nav.import'), Upload],
    ['stats', t('admin.nav.stats'), BarChart3],
  ];

  return (
    <div className="bg-bg-app flex flex-col md:flex-row min-h-dvh">
      <nav aria-label={t('admin.nav.label')} className="md:w-60 shrink-0 bg-brand-900 text-white p-3 flex md:flex-col gap-1 overflow-x-auto">
        <p className="hidden md:block px-3 pt-2 pb-3 font-extrabold tracking-tight">{t('admin.brand')}</p>
        {NAV.map(([id, label, Icon]) => (
          <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}
            className={cn('inline-flex items-center gap-2.5 min-h-11 px-3 rounded-xl text-sm font-bold whitespace-nowrap', section === id ? 'bg-accent-400 text-brand-900' : 'text-brand-200 hover:bg-white/10')}>
            <Icon size={18} aria-hidden /> {label}
          </button>
        ))}
        <div className="md:mt-auto flex md:flex-col gap-1 md:pt-4">
          <LanguageSwitcher variant="dark" />
          <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-2.5 min-h-11 px-3 rounded-xl text-sm font-bold text-brand-200 hover:bg-white/10 whitespace-nowrap">
            <LogOut size={18} aria-hidden /> {t('teacher.dashboard.logout')}
          </button>
          <p className="hidden md:block px-3 text-xs text-brand-300 break-all">{user?.email}</p>
        </div>
      </nav>
      <main className="flex-1 min-w-0 p-4 sm:p-6 flex flex-col gap-4">
        {fallback && <Notice>{t('admin.fallbackNote')}</Notice>}
        {backendMissing && <Notice>{t('admin.backendMissing')}</Notice>}
        {query.isPending && <p className="text-text-muted">{t('admin.loading')}</p>}
        {section === 'themes' && !query.isPending && (
          <ThemesSection
            rows={rows}
            backendMissing={backendMissing}
            loadError={query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null}
            onOpenEditor={openRow}
            onPreview={(row) => preview(createDraft(row.latest.manifest, row.latest.url, row.latest.version))}
            onImport={() => setSection('import')}
          />
        )}
        {section === 'editor' && (
          <EditorSection draft={draft} dispatch={dispatch} replaceDraft={(d) => dispatch({ type: 'load', draft: d })} rows={rows} backendMissing={backendMissing} onPreview={preview} />
        )}
        {section === 'import' && (
          <ImportSection rows={rows} onDraft={(d) => { dispatch({ type: 'load', draft: d }); setSection('editor'); }} />
        )}
        {section === 'stats' && (
          <section className="max-w-3xl rounded-2xl bg-white border border-border-subtle p-4 sm:p-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-text-main mb-2">{t('teacher.stats.title')}</h2>
            <UsageStatsContent />
          </section>
        )}
      </main>
    </div>
  );
}

function Gate() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const admin = useIsAdmin();

  useEffect(() => {
    document.title = `${t('admin.title')} — SoundScout`;
  }, [t]);

  if (loading || (user && admin.loading)) return <Centered><p className="text-text-muted">{t('admin.loading')}</p></Centered>;

  if (!user) {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50"><LanguageSwitcher variant="light" /></div>
        <TeacherLogin
          onSuccess={() => undefined}
          onSwitchToRegister={() => window.location.assign('/docent')}
          onForgotPassword={() => window.location.assign('/docent')}
          onBack={() => window.location.assign('/')}
        />
      </div>
    );
  }

  if (!admin.isAdmin) {
    return (
      <Centered>
        <div className="max-w-md rounded-2xl bg-white border border-border-subtle p-6 text-center flex flex-col gap-3" role="alert">
          <h1 className="text-2xl font-extrabold text-text-main">{t('admin.noAccess.title')}</h1>
          <p className="text-text-muted">{t('admin.noAccess.body', { email: user.email ?? '' })}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="primary" onClick={() => window.location.assign('/docent')}>{t('admin.noAccess.back')}</Button>
            <Button variant="secondary" onClick={() => void signOut()}>{t('teacher.dashboard.logout')}</Button>
          </div>
        </div>
      </Centered>
    );
  }

  return <Dashboard fallback={admin.source === 'email-fallback'} />;
}

export default function AdminPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QueryAuthSync />
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
