/**
 * JoinClassModal — "Heb je een klascode? Lever in bij je docent" (fase 2.7)
 *
 * Eén inleverpad: wie zonder klas begon, typt hier de klascode. Daarna zit
 * de leerling gewoon in de klas (opdrachtkaart, feedback, versies), net als
 * iemand die met de klascode begon. Een praatplaat-klas kan niet zo: daar
 * hoort een plek bij, dus die leerling begint via "Ik heb een code".
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ActiveAssignment } from '../../lib/assignments';

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Klas gevonden en gekozen: zet de sessie en lever in */
  onJoin: (classCode: string, assignment: ActiveAssignment) => void;
}

type Lookup =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'found'; assignment: ActiveAssignment }
  | { state: 'error'; message: string };

export function JoinClassModal({ isOpen, onClose, onJoin }: JoinClassModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });

  // Zoeken zodra er 4 cijfers staan
  useEffect(() => {
    if (code.length !== 4) return;
    let cancelled = false;
    (async () => {
      setLookup({ state: 'checking' });
      try {
        const { getActiveAssignment } = await import('../../lib/assignments');
        const assignment = await getActiveAssignment(code);
        if (cancelled) return;
        if (!assignment) setLookup({ state: 'error', message: t('podium.join.notFound') });
        else if (assignment.type === 'praatplaat') setLookup({ state: 'error', message: t('podium.join.praatplaat') });
        else setLookup({ state: 'found', assignment });
      } catch {
        if (!cancelled) setLookup({ state: 'error', message: t('podium.join.error') });
      }
    })();
    return () => { cancelled = true; };
  }, [code, t]);

  const handleChange = (value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 4));
    setLookup({ state: 'idle' });
  };

  const handleClose = () => {
    setCode('');
    setLookup({ state: 'idle' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('podium.join.title')} size="sm">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted text-center">{t('podium.join.text')}</p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0000"
          aria-label={t('share.codeKinds.classText')}
          className="w-full text-center font-mono text-3xl font-extrabold tracking-[0.4em] px-4 py-3 rounded-xl border-2 border-border-subtle bg-neutral-50 focus:outline-none focus:border-accent-400"
          autoFocus
        />
        {lookup.state === 'checking' && <p className="text-sm text-text-muted text-center">{t('podium.join.checking')}</p>}
        {lookup.state === 'found' && (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-success-50 px-3 py-2 text-sm font-semibold text-success-600">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            {t('podium.join.found', { className: lookup.assignment.className })}
          </p>
        )}
        {lookup.state === 'error' && <p role="alert" className="text-sm text-error-600 text-center">{lookup.message}</p>}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={lookup.state !== 'found'}
          onClick={() => {
            if (lookup.state !== 'found') return;
            onJoin(code, lookup.assignment);
            handleClose();
          }}
        >
          <Send className="w-5 h-5 mr-2" aria-hidden="true" />
          {t('podium.join.button')}
        </Button>
        <Button variant="ghost" onClick={handleClose} className="w-full md:text-text-main md:hover:bg-neutral-100 text-text-main">
          {t('common.cancel')}
        </Button>
      </div>
    </Modal>
  );
}

export default JoinClassModal;
