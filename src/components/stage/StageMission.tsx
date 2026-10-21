/**
 * StageMission — rechterkolom "Jouw soundscape" van het podium v4 (fase 2.2)
 *
 * Opdrachtkaart, meldingen, de stappen (uitklapbaar, vrije volgorde) en de
 * voet met terug naar de studio. Welke stappen er zijn en welke klaar zijn,
 * komt uit `deriveStageSteps` (puur, getest); deze component tekent alleen.
 */

import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check, ChevronDown, ChevronUp, Lock, Mail, MapPin, Maximize2, Dices, Send, CloudUpload,
  Headphones, Music, Film, QrCode, Link2, ArrowLeft, Map as MapIcon, Plus, Info, Award,
  ZoomIn, ZoomOut, Pencil, Download, CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { FeedbackBanner } from '../common/FeedbackBanner';
import { OpdrachtCard } from './OpdrachtCard';
import { allStepsDone, firstOpenStep, PEER_TARGET, type StageStep, type StageStepId } from '../../utils/stageSteps';
import { titleSuggestions } from '../../utils/randomTitles';
import { cn } from '../../utils/cn';
import type { ClassSession } from '../../types';
import type { VersionInfo } from '../../utils/handInVersions';

type ExportState = 'idle' | 'exporting' | 'success' | 'error' | 'unsupported';

export interface StageMissionProps {
  steps: StageStep[];
  session: ClassSession | null;
  isPraatplaat: boolean;
  toasts: { type: 'success' | 'error' | 'info'; message: string }[];
  // Luisteren
  onListen: () => void;
  listened: boolean;
  // Titel
  title: string;
  onTitleChange: (value: string) => void;
  /** Docent zette "zelf een titel typen" uit (migratie 037) */
  titleLocked: boolean;
  // Plek
  zoomed: boolean;
  onToggleZoom: () => void;
  onMoveSpot: () => void;
  // Inleveren (klas)
  isSubmitting: boolean;
  versionInfo: VersionInfo | null;
  onHandIn: () => void;
  // Bewaren (zonder klas)
  onlineSaveCode: string | null;
  isSavingOnline: boolean;
  onSave: () => void;
  onJoinClass: () => void;
  // Feedback docent
  onFeedbackRead: () => void;
  // Feedback klasgenoten
  peerDone: number;
  onStartPeer: () => void;
  // Exporteren
  hasVideo: boolean;
  exportState: ExportState;
  exportProgress: number;
  videoExportState: ExportState;
  videoProgress: number;
  exportMessages: string[];
  onExportMp3: () => void;
  onExportVideo: () => void;
  cardCode: string | null;
  onOpenCard: () => void;
  onShare: () => void;
  // Voet
  onBackToStudio: () => void;
  onMoreSounds: () => void;
  onNew: () => void;
}

function formatClock(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function StageMission(props: StageMissionProps) {
  const { t, i18n } = useTranslation();
  const { steps, session, isPraatplaat } = props;
  // null = automatisch (eerste stap die nog niet klaar is), 'none' = alles dicht
  const [openChoice, setOpenChoice] = useState<StageStepId | 'none' | null>(null);
  const [suggestions, setSuggestions] = useState(() => titleSuggestions(3, i18n.language));
  const openId = openChoice === 'none' ? null : openChoice ?? firstOpenStep(steps);

  const version = props.versionInfo?.version ?? 0;
  const busy = props.exportState === 'exporting' || props.videoExportState === 'exporting';

  const titleOf = (step: StageStep): string => {
    switch (step.id) {
      case 'listen': return t('podium.listen.title');
      case 'title': return t('podium.titleStep.title');
      case 'spot': return t('podium.spot.title');
      case 'hand': return isPraatplaat ? t('podium.hand.titlePraatplaat') : t('podium.hand.title', { className: session?.className ?? '' });
      case 'save': return t('podium.save.title');
      case 'post': return t('podium.post.title');
      case 'peer': return t('podium.peer.title');
      case 'export': return t('podium.export.title');
    }
  };

  const subtitleOf = (step: StageStep, open: boolean): string => {
    if (step.locked) return t('podium.peer.locked');
    if (step.changed && step.id === 'hand') return t('podium.hand.changed', { n: version + 1 });
    if (step.changed && step.id === 'save') return t('podium.save.changed');
    if (step.done) {
      switch (step.id) {
        case 'listen': return t('podium.listen.done');
        case 'title': return props.title;
        case 'spot': return t('podium.spot.done');
        case 'hand': return props.versionInfo
          ? t('podium.hand.done', { n: version, time: formatClock(props.versionInfo.at, i18n.language) })
          : t('podium.listen.done');
        case 'save': return props.onlineSaveCode ?? '';
        case 'post': return t('podium.post.done');
        case 'peer': return t('podium.peer.progress', { n: PEER_TARGET });
        case 'export': return t('podium.export.done');
      }
    }
    if (step.id === 'peer' && props.peerDone > 0) return t('podium.peer.progress', { n: props.peerDone });
    return open ? t('podium.state.busy') : t('podium.state.todo');
  };

  const iconOf = (step: StageStep, index: number): ReactNode => {
    if (step.locked) return <Lock className="w-4 h-4" />;
    if (step.done) return <Check className="w-4 h-4" />;
    if (step.id === 'post') return <Mail className="w-4 h-4" />;
    if (step.id === 'spot') return <MapPin className="w-4 h-4" />;
    return index + 1;
  };

  const bodyOf = (step: StageStep): ReactNode => {
    switch (step.id) {
      case 'listen':
        return (
          <>
            <p className="text-sm text-text-muted">{t('podium.listen.text')}</p>
            <Button variant="primary" onClick={props.onListen} className="w-full">
              <Maximize2 className="w-4 h-4 mr-2" aria-hidden="true" />
              {props.listened ? t('podium.listen.again') : t('podium.listen.button')}
            </Button>
          </>
        );
      case 'title':
        if (props.titleLocked) {
          return (
            <p className="flex items-start gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-text-muted">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              {t('podium.titleStep.auto')}
            </p>
          );
        }
        return (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={props.title}
                onChange={(e) => props.onTitleChange(e.target.value)}
                placeholder={t('podium.titleStep.placeholder')}
                aria-label={t('podium.titleLabel')}
                maxLength={40}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-border-subtle bg-white text-text-main font-semibold focus:outline-none focus:border-accent-400"
              />
              <Button
                variant="secondary"
                onClick={() => setSuggestions(titleSuggestions(3, i18n.language))}
                aria-label={t('podium.titleStep.dice')}
                title={t('podium.titleStep.dice')}
              >
                <Dices className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => props.onTitleChange(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm font-semibold transition-colors',
                    props.title === s ? 'border-accent-500 bg-accent-100 text-accent-800' : 'border-border-subtle bg-white text-text-main hover:bg-neutral-50',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button variant="primary" disabled={!props.title.trim()} onClick={() => setOpenChoice(null)} className="w-full">
              <Check className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('podium.titleStep.confirm')}
            </Button>
            <p className="text-xs text-text-muted">{t('podium.titleStep.tip')}</p>
          </>
        );
      case 'spot':
        return (
          <>
            <p className="text-sm text-text-muted">{t('podium.spot.text')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={props.onMoveSpot} disabled={props.isSubmitting}>
                <MapPin className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {t('podium.spot.move')}
              </Button>
              <Button variant="secondary" size="sm" onClick={props.onToggleZoom}>
                {props.zoomed ? <ZoomOut className="w-4 h-4 mr-1.5" aria-hidden="true" /> : <ZoomIn className="w-4 h-4 mr-1.5" aria-hidden="true" />}
                {props.zoomed ? t('podium.spot.zoomOut') : t('podium.spot.zoomIn')}
              </Button>
            </div>
          </>
        );
      case 'hand': {
        const label = props.isSubmitting
          ? t('podium.hand.sending')
          : props.versionInfo
            ? t('podium.hand.version', { n: version + 1 })
            : isPraatplaat ? t('podium.hand.buttonPraatplaat') : t('podium.hand.button');
        return (
          <>
            {step.changed && (
              <p className="flex items-start gap-2 rounded-xl bg-warning-50 px-3 py-2 text-sm font-semibold text-warning-600">
                <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                {t('podium.hand.changedSince', { n: version })}
              </p>
            )}
            <Button variant="primary" size="lg" onClick={props.onHandIn} disabled={props.isSubmitting || step.done} className="w-full">
              {isPraatplaat ? <MapPin className="w-5 h-5 mr-2" aria-hidden="true" /> : <Send className="w-5 h-5 mr-2" aria-hidden="true" />}
              {step.done ? t('podium.hand.done', { n: version, time: formatClock(props.versionInfo?.at ?? '', i18n.language) }) : label}
            </Button>
            <p className="text-xs text-text-muted">{t('podium.hand.sees')}</p>
          </>
        );
      }
      case 'save':
        return (
          <>
            {props.onlineSaveCode && !step.changed ? (
              <button
                type="button"
                onClick={props.onOpenCard}
                className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent-300 bg-accent-50 p-3 text-left hover:bg-accent-100 transition-colors"
              >
                <QrCode className="w-8 h-8 text-accent-700 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wide text-accent-700">{t('podium.card.label')}</span>
                  <span className="block font-mono text-lg font-extrabold tracking-widest text-text-main">{props.onlineSaveCode}</span>
                </span>
              </button>
            ) : (
              <>
                <p className="text-sm text-text-muted">{step.changed ? t('podium.save.updateText') : t('podium.save.text')}</p>
                <Button variant="primary" size="lg" onClick={props.onSave} isLoading={props.isSavingOnline} className="w-full">
                  <CloudUpload className="w-5 h-5 mr-2" aria-hidden="true" />
                  {props.isSavingOnline ? t('podium.save.saving') : step.changed ? t('podium.save.update') : t('podium.save.button')}
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={props.onJoinClass} className="w-full">
              <Send className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('podium.save.haveClass')}
            </Button>
          </>
        );
      case 'post':
        return (
          <>
            <FeedbackBanner />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={props.onBackToStudio}>
                <Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {t('podium.post.improve')}
              </Button>
              {!step.done && (
                <Button variant="secondary" size="sm" onClick={props.onFeedbackRead}>
                  <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  {t('podium.post.read')}
                </Button>
              )}
            </div>
          </>
        );
      case 'peer':
        return (
          <>
            <p className="text-sm text-text-muted">{t('podium.peer.text')}</p>
            <div className="flex gap-1.5" aria-label={t('podium.peer.progress', { n: Math.min(props.peerDone, PEER_TARGET) })}>
              {Array.from({ length: PEER_TARGET }, (_, i) => (
                <span key={i} className={cn('h-2 flex-1 rounded-full', i < props.peerDone ? 'bg-accent-500' : 'bg-neutral-200')} />
              ))}
            </div>
            {!step.done && (
              <Button variant="primary" onClick={props.onStartPeer} className="w-full">
                <Headphones className="w-4 h-4 mr-2" aria-hidden="true" />
                {props.peerDone > 0 ? t('podium.peer.more') : t('podium.peer.start')}
              </Button>
            )}
          </>
        );
      case 'export': {
        const cardLocked = !props.cardCode;
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Tile icon={<Music className="w-5 h-5" />} label={t('podium.export.music')} sub={t('podium.export.musicSub')} onClick={props.onExportMp3} disabled={busy} />
              <Tile
                icon={<Film className="w-5 h-5" />}
                label={t('podium.export.video')}
                sub={props.hasVideo ? t('podium.export.videoSub') : t('podium.export.videoNone')}
                onClick={props.onExportVideo}
                disabled={!props.hasVideo || busy}
              />
              <Tile
                icon={cardLocked ? <Lock className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                label={t('podium.export.card')}
                sub={cardLocked ? (session ? t('podium.export.cardLockedClass') : t('podium.export.cardLockedSave')) : t('podium.export.cardSub')}
                onClick={props.onOpenCard}
                disabled={cardLocked}
              />
              <Tile icon={<Link2 className="w-5 h-5" />} label={t('podium.export.share')} sub={t('podium.export.shareSub')} onClick={props.onShare} />
            </div>
            {props.exportState === 'exporting' && (
              <ProgressLine label={t('podium.export.makingMusic', { pct: Math.round(props.exportProgress) })} pct={props.exportProgress} />
            )}
            {props.videoExportState === 'exporting' && (
              <ProgressLine label={t('podium.export.makingVideo', { pct: Math.round(props.videoProgress) })} pct={props.videoProgress} />
            )}
            {props.exportMessages.map((m) => (
              <p key={m} className="text-xs text-text-muted">{m}</p>
            ))}
          </>
        );
      }
    }
  };

  const done = allStepsDone(steps);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-text-main tracking-tight">{t('podium.yourSoundscape')}</h2>

      {session && <OpdrachtCard session={session} />}

      {props.toasts.map((toast) => (
        <p
          key={toast.message}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
            toast.type === 'success' ? 'bg-success-50 text-success-600'
              : toast.type === 'info' ? 'bg-warning-50 text-warning-600'
              : 'bg-error-50 text-error-600',
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />}
          {toast.message}
        </p>
      ))}

      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const open = !step.locked && openId === step.id;
          return (
            <li
              key={step.id}
              className={cn(
                'rounded-2xl border-2 bg-white transition-colors',
                open ? 'border-accent-400 shadow-sm' : step.done ? 'border-success-200' : 'border-border-subtle',
                step.locked && 'opacity-60',
              )}
            >
              <button
                type="button"
                onClick={() => setOpenChoice(open ? 'none' : step.id)}
                disabled={step.locked}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    'w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold',
                    step.done ? 'bg-success-500 text-white' : open ? 'bg-accent-500 text-white' : 'bg-neutral-100 text-text-muted',
                  )}
                >
                  {iconOf(step, i)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-text-main leading-tight">{titleOf(step)}</span>
                  <span className={cn('block text-xs truncate', step.changed ? 'text-warning-600 font-semibold' : 'text-text-muted')}>
                    {subtitleOf(step, open)}
                  </span>
                </span>
                {!step.locked && (open
                  ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />)}
              </button>
              {open && <div className="px-3 pb-3 flex flex-col gap-2.5">{bodyOf(step)}</div>}
            </li>
          );
        })}
      </ol>

      {done && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-50 px-3 py-3">
          <Award className="w-8 h-8 text-success-600 shrink-0" aria-hidden="true" />
          <b className="text-success-600">{session ? t('podium.doneAll') : t('podium.doneAllSaved')}</b>
        </div>
      )}

      <div className="mt-2 pt-3 border-t border-border-subtle flex flex-col gap-2">
        <Button variant="secondary" onClick={props.onBackToStudio} disabled={props.isSubmitting} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('podium.foot.back')}
        </Button>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <button type="button" onClick={props.onMoreSounds} disabled={props.isSubmitting} className="inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-text-muted hover:text-text-main disabled:opacity-40 disabled:cursor-not-allowed">
            <MapIcon className="w-4 h-4" aria-hidden="true" />
            {t('podium.foot.moreSounds')}
          </button>
          <button type="button" onClick={props.onNew} disabled={props.isSubmitting} className="inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-text-muted hover:text-text-main disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('podium.foot.new')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, label, sub, onClick, disabled = false }: { icon: ReactNode; label: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 rounded-xl border-2 border-border-subtle bg-white px-2 py-3 text-center transition-colors hover:border-accent-300 hover:bg-accent-50 disabled:opacity-50 disabled:hover:border-border-subtle disabled:hover:bg-white disabled:cursor-not-allowed"
    >
      <span className="text-accent-700">{icon}</span>
      <span className="text-sm font-bold text-text-main">{label}</span>
      <span className="text-xs text-text-muted">{sub}</span>
    </button>
  );
}

function ProgressLine({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        {label}
      </span>
      <span className="block h-1.5 rounded-full bg-neutral-200 overflow-hidden">
        <span className="block h-full bg-accent-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
    </div>
  );
}

export default StageMission;
