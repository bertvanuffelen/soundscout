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
import { ArrowLeft, BookOpen, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { activatePendingAssignment } from '../../utils/compositionInit';
import { findStoryboardById } from '../../data/themes';
import { Button } from '../ui/Button';
import { logger } from '../../utils/logger';
import type { Template } from '../../types';

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

        {/* Header: klascode-context */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-400/20 text-accent-300 md:bg-accent-100 md:text-accent-700 text-xs font-mono tracking-wider mb-3">
            {t('assignmentLanding.classCodeLabel')} {classCode}
          </div>
          {assignment && (
            <p className="text-brand-300 md:text-text-muted text-sm">
              {t('assignmentLanding.classLabel')} <span className="text-white md:text-text-main font-medium">{assignment.className}</span>
            </p>
          )}
        </div>

        {/* Body per assignment-type */}
        {assignment?.type === 'template' && assignment.template && (
          <TemplateBody template={assignment.template} />
        )}
        {assignment?.type === 'praatplaat' && assignment.praatplaat && (
          <PraatplaatBody praatplaat={assignment.praatplaat} />
        )}
        {!assignment && <RouteCBody />}

        {error && (
          <p role="alert" className="text-red-400 text-sm mt-4">
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

function PraatplaatBody({ praatplaat }: { praatplaat: { name: string; imageUrl: string } }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-teal-500/20 md:bg-teal-100 text-teal-400 md:text-teal-600 flex items-center justify-center">
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
      <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-video mb-4">
        <img
          src={praatplaat.imageUrl}
          alt={praatplaat.name}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-sm text-brand-300 md:text-text-muted">
        {t('assignmentLanding.praatplaat.description')}
      </p>
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
