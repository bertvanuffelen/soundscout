/**
 * StageActionsModal - Actiemenu voor het podium
 *
 * Groepeert alle secundaire acties (delen, exporteren, online bewaren)
 * in een overzichtelijke modal, zodat het podium-scherm schoon blijft.
 */

import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  Loader2,
  CloudUpload,
  Link2,
  Send,
  FileText,
  Film,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface StageActionsModalProps {
  compositionName: string;
  hasStoryboard: boolean;
  isTeacher: boolean;
  /** When true, hide "Online bewaren" and "Inleveren bij docent" (auto-submit handles it) */
  hasClassSession?: boolean;

  // Export state
  exportState: 'idle' | 'exporting' | 'success' | 'error';
  exportProgress: number;
  videoExportState: 'idle' | 'exporting' | 'success' | 'unsupported' | 'error';
  videoProgress: number;

  // Handlers
  onExportMp3: () => void;
  onExportVideo: () => void;
  onSaveOnline: () => void;
  onShareLink: () => void;
  onShareTeacher: () => void;
  onSaveTemplate: () => void;
  onClose: () => void;
}

export function StageActionsModal({
  compositionName,
  hasStoryboard,
  isTeacher,
  hasClassSession = false,
  exportState,
  exportProgress,
  videoExportState,
  videoProgress,
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2 sticky top-0 bg-bg-surface rounded-t-2xl z-10">
          <h2 className="text-lg font-extrabold tracking-tight text-text-main">
            {t('stage.actionsTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-5 flex flex-col gap-4">
          {/* --- Bewaren & Delen --- */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {t('stage.actionsSaveShare')}
            </p>
            <div className="flex flex-col gap-2">
              {/* Online bewaren: verborgen in klascode-flow (auto-submit regelt het) */}
              {!hasClassSession && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { onSaveOnline(); onClose(); }}
                  disabled={nameDisabled}
                  className="w-full justify-start"
                >
                  <CloudUpload size={18} className="mr-3 shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-medium">{t('saveOnline.title')}</span>
                    <span className="block text-xs text-text-muted">{t('stage.actionsOnlineHint')}</span>
                  </span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="md"
                onClick={() => { onShareLink(); onClose(); }}
                disabled={nameDisabled}
                className="w-full justify-start"
              >
                <Link2 size={18} className="mr-3 shrink-0" />
                <span className="text-left">
                  <span className="block text-sm font-medium">{t('share.shareLink')}</span>
                  <span className="block text-xs text-text-muted">{t('stage.actionsShareHint')}</span>
                </span>
              </Button>

              {/* Inleveren bij docent: verborgen in klascode-flow (auto-submit regelt het) */}
              {!hasClassSession && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { onShareTeacher(); onClose(); }}
                  disabled={nameDisabled}
                  className="w-full justify-start"
                >
                  <Send size={18} className="mr-3 shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-medium">{t('stage.shareWithTeacher')}</span>
                    <span className="block text-xs text-text-muted">{t('stage.actionsTeacherHint')}</span>
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* --- Exporteren --- */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {t('stage.actionsExport')}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => { onExportMp3(); }}
                disabled={exportState === 'exporting'}
                className="w-full justify-start"
              >
                {exportState === 'exporting' ? (
                  <>
                    <Loader2 size={18} className="mr-3 shrink-0 animate-spin" />
                    <span className="text-sm">{t('stage.exporting')} {exportProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download size={18} className="mr-3 shrink-0" />
                    <span className="text-left">
                      <span className="block text-sm font-medium">{t('stage.download')}</span>
                      <span className="block text-xs text-text-muted">{t('stage.actionsExportMp3Hint')}</span>
                    </span>
                  </>
                )}
              </Button>

              {hasStoryboard && videoExportState !== 'unsupported' && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { onExportVideo(); }}
                  disabled={videoExportState === 'exporting' || exportState === 'exporting'}
                  className="w-full justify-start"
                >
                  {videoExportState === 'exporting' ? (
                    <>
                      <Loader2 size={18} className="mr-3 shrink-0 animate-spin" />
                      <span className="text-sm">{t('stage.exportingVideo')} {videoProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Film size={18} className="mr-3 shrink-0" />
                      <span className="text-left">
                        <span className="block text-sm font-medium">{t('stage.downloadVideo')}</span>
                        <span className="block text-xs text-text-muted">{t('stage.actionsExportVideoHint')}</span>
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* --- Docent (conditioneel) --- */}
          {isTeacher && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                {t('stage.actionsTeacher')}
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => { onSaveTemplate(); onClose(); }}
                disabled={nameDisabled}
                className="w-full justify-start"
              >
                <FileText size={18} className="mr-3 shrink-0" />
                <span className="text-left">
                  <span className="block text-sm font-medium">{t('templates.saveAsTemplate')}</span>
                  <span className="block text-xs text-text-muted">{t('stage.actionsTemplateHint')}</span>
                </span>
              </Button>
            </div>
          )}

          {nameDisabled && (
            <p className="text-xs text-warning-500 text-center">
              {t('stage.actionsNameRequired')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StageActionsModal;
