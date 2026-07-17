/**
 * StageActionsModal - "Opslaan & Delen" (testronde 3, ontwerp Bert)
 *
 * Eén gecombineerde modal voor alles wat je met een compositie kunt doen,
 * ingedeeld naar "voor wie": drie kolommen op desktop (Voor jezelf ·
 * Voor de klas · Delen met anderen), gestapeld als bottom-sheet op mobiel.
 * De primaire "Opslaan & Delen"-knop op het podium opent deze modal;
 * "Opslaan — op dit apparaat" is hier de snelle eerste actie.
 */

import { useTranslation } from 'react-i18next';
import {
  X,
  Check,
  Save,
  Download,
  Loader2,
  CloudUpload,
  Link2,
  Send,
  FileText,
  Film,
  User,
  GraduationCap,
  Globe,
  Lock,
  MonitorPlay,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { cn } from '../../utils/cn';

interface StageActionsModalProps {
  compositionName: string;
  hasStoryboard: boolean;
  isTeacher: boolean;
  /** Actieve klas-sessie: kolom "Voor de klas" toont dan de inleverstatus */
  hasClassSession?: boolean;
  className?: string | null;
  /** Bewaarcode van de eigen inzending (na inleveren) */
  classSaveCode?: string | null;
  /** Is de inzending gesynchroniseerd met de klas? */
  submissionSynced?: boolean;

  // Save state
  saveSuccess: boolean;

  // Export state
  exportState: 'idle' | 'exporting' | 'success' | 'error';
  exportProgress: number;
  videoExportState: 'idle' | 'exporting' | 'success' | 'unsupported' | 'error';
  videoProgress: number;

  // Handlers
  onSave: () => void;
  onPresent: () => void;
  onExportMp3: () => void;
  onExportVideo: () => void;
  onSaveOnline: () => void;
  onShareLink: () => void;
  onShareTeacher: () => void;
  onSaveTemplate: () => void;
  onClose: () => void;
}

/** Actieknop met icoon + naam + korte uitleg (leerlingvriendelijk) */
function ActionButton({
  icon,
  label,
  hint,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size="md"
      onClick={onClick}
      disabled={disabled}
      className="w-full justify-start"
    >
      <span className="mr-3 shrink-0">{icon}</span>
      <span className="text-left min-w-0">
        <span className="block text-sm font-medium truncate">{label}</span>
        <span className="block text-xs text-text-muted truncate">{hint}</span>
      </span>
    </Button>
  );
}

/** Kolomkop: gekleurde pill met icoon — maakt "voor wie" direct leesbaar */
function ColumnHeader({ icon, label, colorClasses }: { icon: React.ReactNode; label: string; colorClasses: string }) {
  return (
    <p className={cn('inline-flex items-center gap-1.5 rounded-full text-xs font-bold px-2.5 py-1 mb-2', colorClasses)}>
      {icon}
      {label}
    </p>
  );
}

export function StageActionsModal({
  compositionName,
  hasStoryboard,
  isTeacher,
  hasClassSession = false,
  className = null,
  classSaveCode = null,
  submissionSynced = false,
  saveSuccess,
  exportState,
  exportProgress,
  videoExportState,
  videoProgress,
  onSave,
  onPresent,
  onExportMp3,
  onExportVideo,
  onSaveOnline,
  onShareLink,
  onShareTeacher,
  onSaveTemplate,
  onClose,
}: StageActionsModalProps) {
  const { t } = useTranslation();
  const nameDisabled = !compositionName.trim();
  const modalRef = useModalBehavior(onClose);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-actions-title"
        className="bg-bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 pb-2 sticky top-0 bg-bg-surface rounded-t-2xl z-10">
          <div>
            <h2 id="stage-actions-title" className="text-lg sm:text-xl font-extrabold tracking-tight text-text-main">
              {t('stage.actionsTitle')}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">{t('stage.actionsSubtitle')}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-text-muted hover:text-text-main p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* --- Kolom 1: Voor jezelf --- */}
            <div className="rounded-2xl bg-neutral-50 p-3">
              <ColumnHeader
                icon={<User size={13} aria-hidden="true" />}
                label={t('stage.colSelf')}
                colorClasses="bg-accent-100 text-accent-800"
              />
              <div className="flex flex-col gap-2">
                <ActionButton
                  icon={saveSuccess ? <Check size={18} className="text-success-600" /> : <Save size={18} className="text-accent-600" />}
                  label={saveSuccess ? t('stage.saved') : t('stage.save')}
                  hint={t('stage.actionsSaveHint')}
                  onClick={onSave}
                  disabled={saveSuccess}
                />
                {/* Online bewaren: verborgen in klascode-flow (auto-sync regelt het) */}
                {!hasClassSession && (
                  <ActionButton
                    icon={<CloudUpload size={18} className="text-accent-600" />}
                    label={t('saveOnline.title')}
                    hint={t('stage.actionsOnlineHint')}
                    onClick={() => { onSaveOnline(); onClose(); }}
                    disabled={nameDisabled}
                  />
                )}
                <ActionButton
                  icon={exportState === 'exporting'
                    ? <Loader2 size={18} className="animate-spin text-accent-600" />
                    : <Download size={18} className="text-accent-600" />}
                  label={exportState === 'exporting' ? `${t('stage.exporting')} ${exportProgress}%` : t('stage.download')}
                  hint={t('stage.actionsExportMp3Hint')}
                  onClick={onExportMp3}
                  disabled={exportState === 'exporting'}
                />
                {hasStoryboard && videoExportState !== 'unsupported' && (
                  <ActionButton
                    icon={videoExportState === 'exporting'
                      ? <Loader2 size={18} className="animate-spin text-accent-600" />
                      : <Film size={18} className="text-accent-600" />}
                    label={videoExportState === 'exporting' ? `${t('stage.exportingVideo')} ${videoProgress}%` : t('stage.downloadVideo')}
                    hint={t('stage.actionsExportVideoHint')}
                    onClick={onExportVideo}
                    disabled={videoExportState === 'exporting' || exportState === 'exporting'}
                  />
                )}
              </div>
            </div>

            {/* --- Kolom 2: Voor de klas --- */}
            <div className="rounded-2xl bg-neutral-50 p-3">
              <ColumnHeader
                icon={<GraduationCap size={13} aria-hidden="true" />}
                label={t('stage.colClass')}
                colorClasses="bg-brand-100 text-brand-800"
              />
              <div className="flex flex-col gap-2">
                {/* Presenteren: compositie fullscreen op het digibord (fase 2) */}
                <ActionButton
                  icon={<MonitorPlay size={18} className="text-brand-700" />}
                  label={t('stage.presentButton')}
                  hint={t('stage.actionsPresentHint')}
                  onClick={() => { onPresent(); onClose(); }}
                />
                {hasClassSession ? (
                  <div className="rounded-xl bg-brand-100/60 border border-brand-100 px-3 py-2.5">
                    {submissionSynced ? (
                      <>
                        <p className="text-sm font-medium text-brand-800 flex items-center gap-1.5">
                          <Check size={15} aria-hidden="true" className="shrink-0" />
                          {t('submissions.autoSubmitSuccess', { className: className ?? '' })}
                        </p>
                        {classSaveCode && (
                          <p className="text-xs text-brand-700 mt-1.5">
                            {t('stage.yourCodeTitle')}{' '}
                            <span className="font-mono font-extrabold tracking-widest text-brand-900">{classSaveCode}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-brand-800">
                        {t('stage.classNotYetSubmitted', { className: className ?? '' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <ActionButton
                    icon={<Send size={18} className="text-brand-700" />}
                    label={t('stage.shareWithTeacher')}
                    hint={t('stage.actionsTeacherHint')}
                    onClick={() => { onShareTeacher(); onClose(); }}
                    disabled={nameDisabled}
                  />
                )}
              </div>
            </div>

            {/* --- Kolom 3: Delen met anderen --- */}
            <div className="rounded-2xl bg-neutral-50 p-3">
              <ColumnHeader
                icon={<Globe size={13} aria-hidden="true" />}
                label={t('stage.colShare')}
                colorClasses="bg-success-100 text-success-700"
              />
              <div className="flex flex-col gap-2">
                <ActionButton
                  icon={<Link2 size={18} className="text-success-600" />}
                  label={t('share.shareLink')}
                  hint={t('stage.actionsShareHint')}
                  onClick={() => { onShareLink(); onClose(); }}
                  disabled={nameDisabled}
                />
              </div>
            </div>
          </div>

          {nameDisabled && (
            <p className="text-xs text-warning-500 text-center mt-3">
              {t('stage.actionsNameRequired')}
            </p>
          )}

          {/* --- Docent-rij (alleen ingelogde docent) --- */}
          {isTeacher && (
            <div className="border-t border-border-subtle mt-4 pt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <Lock size={13} aria-hidden="true" />
                {t('stage.teacherOnly')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onSaveTemplate(); onClose(); }}
                disabled={nameDisabled}
              >
                <FileText size={15} className="mr-2" />
                {t('templates.saveAsTemplate')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StageActionsModal;
