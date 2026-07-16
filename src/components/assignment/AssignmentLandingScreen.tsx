/**
 * AssignmentLandingScreen - Tussenscherm na klascode-invoer (#78)
 *
 * Toont context van de gevonden opdracht voordat de leerling "in" de opdracht
 * duikt. Zo weten leerlingen welke klas en welke opdracht ze binnengaan en
 * kunnen docenten met de hele klas kort op de stap landen. Ondersteunt drie
 * varianten:
 *
 * - `template` → docent-template met samples + instructies → "Starten" init't
 *   de template en opent de studio.
 * - `praatplaat` → collaboratieve klankkaart → "Starten" opent
 *   `PraatplaatSelectScreen` zodat leerlingen hun plek kiezen.
 * - `null` (Route C) → klascode is geldig maar er is (nog) geen actieve
 *   opdracht. Soft-recovery: "Terug naar start" of opnieuw proberen.
 *
 * De pendingAssignment komt uit `appStore.pendingAssignment` en wordt gezet
 * door `lookupAndRouteAssignment` (zie ShareCodeInput / App.tsx ?pp=).
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, Image as ImageIcon, Clapperboard, Music, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { activatePendingAssignment } from '../../utils/compositionInit';
import { findStoryboardById, getTheme } from '../../data/themes';
import { Button } from '../ui/Button';
import { OpdrachtkaartCard } from './OpdrachtkaartCard';
import { logger } from '../../utils/logger';
import type { TFunction } from 'i18next';
import type { ActiveAssignment, AssignmentStoryboard } from '../../lib/assignments';
import type { OpdrachtkaartContent, Template } from '../../types';

export default function AssignmentLandingScreen() {
  const { t } = useTranslation();
  const pending = useAppStore((s) => s.pendingAssignment);
  const goToStart = useAppStore((s) => s.goToStart);

  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    if (!pending?.assignment) return;
    setIsStarting(true);
    setError(null);
    try {
      await activatePendingAssignment();
    } catch (err) {
      logger.error('[AssignmentLandingScreen] activate failed', err);
      setError(t('assignmentLanding.startError'));
      setIsStarting(false);
    }
  }, [pending, t]);

  // Safety: als pending ontbreekt (bv. direct geopend), terug naar start
  if (!pending) {
    return (
      <div className="min-h-screen bg-brand-900 md:bg-bg-app flex flex-col items-center justify-center p-6">
        <p className="text-white md:text-text-main mb-4">{t('assignmentLanding.missingContext')}</p>
        <Button variant="primary" onClick={goToStart}>
          {t('assignmentLanding.backToStart')}
        </Button>
      </div>
    );
  }

  const { classCode, assignment } = pending;
  // "Zin onder de afbeelding" (type-uitleg) alleen tonen als er GEEN
  // docent-opdrachtkaart is — anders vertelt de kaart het verhaal (Notion).
  const hasTeacherCard = !!(assignment?.card && (assignment.card.title || assignment.card.bullets.length > 0));

  return (
    <div className="min-h-screen bg-brand-900 md:bg-bg-app flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl md:bg-bg-surface md:rounded-2xl md:shadow-xl md:p-8 lg:p-10 md:p-8">
        {/* Back */}
        <button
          onClick={goToStart}
          className="flex items-center gap-1.5 text-brand-300 hover:text-white md:text-text-muted md:hover:text-text-main mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t('assignmentLanding.back')}</span>
        </button>

        {/* Indeling (testronde 2, wens Bert): 1) header met titel/type-icoon
            2) grote afbeelding 3) labels klascode + klas 4) opdrachtkaart */}

        {/* 1+2: Body per assignment-type (header + afbeelding + evt. uitleg) */}
        {assignment?.type === 'template' && assignment.template && (
          <TemplateBody template={assignment.template} />
        )}
        {assignment?.type === 'praatplaat' && assignment.praatplaat && (
          <PraatplaatBody praatplaat={assignment.praatplaat} showDescription={!hasTeacherCard} />
        )}
        {assignment?.type === 'storyboard' && assignment.storyboard && (
          <StoryboardBody storyboard={assignment.storyboard} showDescription={!hasTeacherCard} />
        )}
        {assignment?.type === 'free' && assignment.free && (
          <FreeBody free={assignment.free} showDescription={!hasTeacherCard} />
        )}
        {!assignment && <RouteCBody />}

        {/* 3: Labels klascode + klas */}
        {assignment && (
          <div className="mt-5 mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-400/20 text-accent-300 md:bg-accent-100 md:text-accent-700 text-xs font-mono tracking-wider">
              {t('assignmentLanding.classCodeLabel')} {classCode}
            </span>
            <span className="text-brand-300 md:text-text-muted text-sm">
              {t('assignmentLanding.classLabel')} <span className="text-white md:text-text-main font-medium">{assignment.className}</span>
            </span>
          </div>
        )}
        {!assignment && (
          <div className="mt-5 mb-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-400/20 text-accent-300 md:bg-accent-100 md:text-accent-700 text-xs font-mono tracking-wider">
              {t('assignmentLanding.classCodeLabel')} {classCode}
            </span>
          </div>
        )}

        {/* 4: Opdrachtkaart (docent-kaart of per-type default) */}
        {assignment && <OpdrachtkaartCard card={resolveCard(t, assignment)} />}

        {error && (
          <p role="alert" className="text-error-400 text-sm mt-4">
            {error}
          </p>
        )}

        {/* Footer: acties */}
        {assignment ? (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="ghost" onClick={goToStart} disabled={isStarting}>
              {t('assignmentLanding.back')}
            </Button>
            <Button variant="primary" onClick={handleStart} disabled={isStarting}>
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('assignmentLanding.starting')}
                </>
              ) : (
                t('assignmentLanding.start')
              )}
            </Button>
          </div>
        ) : (
          // Route C soft-recovery — geen actieve opdracht, geef expliciete uitwegen
          <RouteCActions />
        )}
      </div>
    </div>
  );
}

function RouteCActions() {
  const { t } = useTranslation();
  const goToStart = useAppStore((s) => s.goToStart);

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
      <Button variant="ghost" onClick={goToStart}>
        {t('assignmentLanding.none.otherCode')}
      </Button>
      <Button variant="primary" onClick={goToStart}>
        {t('assignmentLanding.none.composeFree')}
      </Button>
    </div>
  );
}

/**
 * Bepaalt welke opdrachtkaart de leerling ziet: de door de docent gekoppelde
 * kaart, of anders de per-type default-kaart (i18n). Vorm-onafhankelijk.
 */
function resolveCard(t: TFunction, assignment: ActiveAssignment): OpdrachtkaartContent {
  if (assignment.card && (assignment.card.title || assignment.card.bullets.length > 0)) {
    return assignment.card;
  }
  const base = `assignmentCards.defaults.${assignment.type}`;
  const raw: unknown = t(`${base}.bullets`, { returnObjects: true });
  const bullets = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  return { title: t(`${base}.title`), bullets };
}

// --- Sub-components ---

/**
 * Zoekt een preview-afbeelding voor een template-opdracht:
 * 1. Expliciete praatplaat-snapshot in compositionData → gebruik die imageUrl.
 * 2. `storyboardId` die niet naar een praatplaat verwijst → resolve via
 *    `findStoryboardById` en pak `coverImage`.
 * 3. Anders → geen preview.
 *
 * Dit toont de leerling dezelfde visuele context als de docent had bij het
 * bouwen van het template, nog voordat de studio opent.
 */
function getTemplatePreview(template: Template): { imageUrl: string; count: number } | null {
  const data = template.compositionData;
  if (data.praatplaat?.imageUrl) {
    return { imageUrl: data.praatplaat.imageUrl, count: 1 };
  }
  if (data.storyboardId && !data.storyboardId.startsWith('praatplaat-')) {
    const found = findStoryboardById(data.storyboardId);
    if (found) {
      return { imageUrl: found.storyboard.coverImage, count: found.storyboard.images.length };
    }
  }
  return null;
}

function TemplateBody({ template }: { template: Template }) {
  const { t } = useTranslation();
  const preview = getTemplatePreview(template);

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-accent-500/20 md:bg-accent-100 text-accent-400 md:text-accent-600 flex items-center justify-center">
          <BookOpen size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-300 md:text-text-muted mb-0.5">
            {t('assignmentLanding.template.kind')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main truncate">
            {template.name}
          </h1>
          {template.teacherName && (
            <p className="text-sm text-brand-300 md:text-text-muted mt-1">
              {t('assignmentLanding.template.by', { teacher: template.teacherName })}
            </p>
          )}
        </div>
      </div>
      {preview && (
        <div className="relative rounded-xl overflow-hidden bg-neutral-100 aspect-video mb-4">
          <img
            src={preview.imageUrl}
            alt={template.name}
            className="w-full h-full object-cover"
          />
          {preview.count > 1 && (
            <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
              {t('assignmentLanding.template.storyboardCount', { count: preview.count })}
            </span>
          )}
        </div>
      )}
      {template.description && (
        <p className="text-white/80 md:text-text-main mb-4">{template.description}</p>
      )}
      {template.instructions && (
        <div className="rounded-xl bg-white/5 md:bg-neutral-100 border border-white/10 md:border-neutral-200 p-4">
          <h2 className="text-xs uppercase tracking-wider text-brand-300 md:text-text-muted mb-2">
            {t('assignmentLanding.template.instructions')}
          </h2>
          <p className="text-white md:text-text-main whitespace-pre-wrap">{template.instructions}</p>
        </div>
      )}
    </div>
  );
}

function PraatplaatBody({ praatplaat, showDescription }: { praatplaat: { name: string; imageUrl: string }; showDescription: boolean }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-accent-500/20 md:bg-accent-100 text-accent-400 md:text-accent-600 flex items-center justify-center">
          <ImageIcon size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-300 md:text-text-muted mb-0.5">
            {t('assignmentLanding.praatplaat.kind')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main truncate">
            {praatplaat.name}
          </h1>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-video">
        <img
          src={praatplaat.imageUrl}
          alt={praatplaat.name}
          className="w-full h-full object-cover"
        />
      </div>
      {showDescription && (
        <p className="text-sm text-brand-300 md:text-text-muted mt-4">
          {t('assignmentLanding.praatplaat.description')}
        </p>
      )}
    </div>
  );
}

function StoryboardBody({ storyboard, showDescription }: { storyboard: AssignmentStoryboard; showDescription: boolean }) {
  const { t } = useTranslation();
  // Alle frames tonen met bladerpijltjes (testronde 2, Notion-wens): het
  // registry-storyboard is via de ref op te lossen; valt terug op de cover.
  const frames = findStoryboardById(storyboard.ref)?.storyboard.images ?? null;
  const [frameIndex, setFrameIndex] = useState(0);
  const frameCount = frames?.length ?? 1;
  const currentFrame = frames?.[frameIndex] ?? null;

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-accent-500/20 md:bg-accent-100 text-accent-400 md:text-accent-600 flex items-center justify-center">
          <Clapperboard size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-300 md:text-text-muted mb-0.5">
            {t('assignmentLanding.storyboard.kind')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main truncate">
            {t(storyboard.nameKey)}
          </h1>
        </div>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-neutral-100 aspect-video">
        <img
          src={currentFrame?.url ?? storyboard.coverImage}
          alt={currentFrame ? t(currentFrame.label) : t(storyboard.nameKey)}
          className="w-full h-full object-cover"
        />
        {frames && frameCount > 1 && (
          <>
            <button
              type="button"
              onClick={() => setFrameIndex((i) => (i - 1 + frameCount) % frameCount)}
              aria-label={t('common.previous')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65 backdrop-blur-sm transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setFrameIndex((i) => (i + 1) % frameCount)}
              aria-label={t('common.next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65 backdrop-blur-sm transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
              {frameIndex + 1} / {frameCount}
            </span>
          </>
        )}
        {!frames && storyboard.imageCount > 1 && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
            {t('assignmentLanding.template.storyboardCount', { count: storyboard.imageCount })}
          </span>
        )}
      </div>
      {showDescription && (
        <p className="text-sm text-brand-300 md:text-text-muted mt-4">
          {t('assignmentLanding.storyboard.description')}
        </p>
      )}
    </div>
  );
}

function FreeBody({ free, showDescription }: { free: { themeId: string; themeName: string }; showDescription: boolean }) {
  const { t } = useTranslation();
  const theme = getTheme(free.themeId);
  const preview = theme?.map.backgroundImage ?? null;
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-accent-500/20 md:bg-accent-100 text-accent-400 md:text-accent-600 flex items-center justify-center">
          <Music size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-300 md:text-text-muted mb-0.5">
            {t('assignmentLanding.free.kind')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main truncate">
            {free.themeName}
          </h1>
        </div>
      </div>
      {preview && (
        <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-video">
          <img src={preview} alt={free.themeName} className="w-full h-full object-cover" />
        </div>
      )}
      {showDescription && (
        <p className="text-sm text-brand-300 md:text-text-muted mt-4">
          {t('assignmentLanding.free.description')}
        </p>
      )}
    </div>
  );
}

function RouteCBody() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-warning-500/20 md:bg-warning-100 text-warning-400 md:text-warning-600 flex items-center justify-center">
        <AlertCircle size={24} />
      </div>
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-text-main mb-2">
          {t('assignmentLanding.none.heading')}
        </h1>
        <p className="text-white/80 md:text-text-main">
          {t('assignmentLanding.none.message')}
        </p>
      </div>
    </div>
  );
}
