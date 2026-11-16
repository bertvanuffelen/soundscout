/**
 * UpdateNotice — "Er is een nieuwe versie" (V2 Fase 2 — offline).
 *
 * Verschijnt alleen op een rustig moment: op het startscherm of het
 * docentenscherm, en alleen als er geen werk open staat. Een leerling die
 * bezig is ziet deze melding dus nooit; die krijgt de nieuwe versie vanzelf
 * de volgende keer dat de app helemaal opnieuw start.
 */
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore';
import { useTimelineStore } from '../stores/timelineStore';
import { useLibraryStore } from '../stores/libraryStore';
import { Button } from '../components/ui/Button';
import { useUpdateStore } from './updateStore';

const QUIET_SCREENS = new Set(['start', 'teacher']);

export default function UpdateNotice() {
  const { t } = useTranslation();
  const needRefresh = useUpdateStore((s) => s.needRefresh);
  const dismissed = useUpdateStore((s) => s.dismissed);
  const applyUpdate = useUpdateStore((s) => s.applyUpdate);
  const currentScreen = useAppStore((s) => s.currentScreen);
  // Zelfde definitie als hasUnsavedWork() (useLeaveGuard), maar reactief
  const hasClips = useTimelineStore((s) => s.selectHasClips());
  const hasSounds = useLibraryStore(
    (s) => s.librarySamples.length > 0 || s.recorderSlots.some((slot) => slot !== null),
  );

  if (!needRefresh || dismissed || hasClips || hasSounds || !QUIET_SCREENS.has(currentScreen)) return null;

  return (
    <div
      role="status"
      data-testid="update-notice"
      className="fixed bottom-4 left-1/2 z-toast flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-brand-900 px-4 py-3 text-text-inverse shadow-lg"
    >
      <p className="flex-1 text-sm font-semibold">{t('pwa.updateAvailable')}</p>
      <Button variant="ghost" size="sm" onClick={() => useUpdateStore.setState({ dismissed: true })}>
        {t('pwa.later')}
      </Button>
      <Button variant="primary" size="sm" onClick={applyUpdate}>
        {t('pwa.updateNow')}
      </Button>
    </div>
  );
}
