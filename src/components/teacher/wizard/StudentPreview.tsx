/**
 * StudentPreview — telefoonvoorbeeld "Zo ziet de leerling het" in de
 * opdracht-wizard (ontwerp ronde 3b, variant D). Toont titel, beeld,
 * de uitlegstapjes en de Starten-knop zoals de leerling ze na de klascode
 * krijgt (AssignmentLandingScreen), zodat de docent vóór het klaarzetten
 * weet wat er gebeurt.
 */

import { useTranslation } from 'react-i18next';
import { Clock, Image as ImageIcon } from 'lucide-react';
import type { AssignmentType } from '../../../lib/assignments';
import { TYPE_META } from '../assignmentTypeMeta';
import { cn } from '../../../utils/cn';

interface StudentPreviewProps {
  title: string | null;
  imageUrl: string | null;
  type: AssignmentType | null;
  /** Titel van de uitlegkaart (eigen kaart of de standaard) */
  cardTitle: string;
  bullets: string[];
  durationLabel?: string;
  className?: string;
}

export function StudentPreview({ title, imageUrl, type, cardTitle, bullets, durationLabel, className }: StudentPreviewProps) {
  const { t } = useTranslation();
  const Icon = type ? TYPE_META[type].Icon : ImageIcon;

  return (
    <div className={className}>
      <p className="text-xs font-extrabold text-text-muted uppercase tracking-wide mb-2">
        {t('teacher.wizard.previewTitle')}
      </p>
      <div className="w-[210px] rounded-[26px] border-[7px] border-brand-900 bg-bg-surface overflow-hidden shadow-lg">
        <div className="bg-brand-900 text-white text-xs font-extrabold px-3 py-2 truncate">
          {title ?? '…'}
        </div>
        <div className="p-2.5 text-[11px] leading-snug">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full aspect-video object-cover rounded-lg" />
          ) : (
            <div
              className={cn(
                'w-full aspect-video rounded-lg flex items-center justify-center',
                type ? TYPE_META[type].tone.tile : 'bg-neutral-100 text-neutral-400',
              )}
            >
              <Icon className="w-7 h-7" aria-hidden="true" />
            </div>
          )}
          {title ? (
            <>
              <p className="font-extrabold text-text-main mt-2">{cardTitle}</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-text-main">
                {bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              {durationLabel && (
                <p className="mt-1.5 text-text-muted inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" /> {durationLabel}
                </p>
              )}
              <div className="mt-2 rounded-full bg-accent-400 text-accent-900 text-center font-extrabold py-1.5">
                {t('teacher.wizard.previewStart')}
              </div>
            </>
          ) : (
            <p className="text-text-muted mt-2">{t('teacher.wizard.previewEmpty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentPreview;
