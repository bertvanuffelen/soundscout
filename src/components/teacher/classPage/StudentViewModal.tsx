/**
 * StudentViewModal — "Zoals leerlingen het zien": haalt de opdracht op via
 * dezelfde RPC als de leerling (get_active_assignment op de klascode), dus
 * met precies de uitleg, duur en titel die de leerling krijgt.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { getActiveAssignment, type ActiveAssignment } from '../../../lib/assignments';
import { Modal } from '../../ui/Modal';
import { StudentPreview } from '../wizard/StudentPreview';

interface StudentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
}

function titleAndImage(a: ActiveAssignment, t: (k: string) => string): { title: string; imageUrl: string | null } {
  switch (a.type) {
    case 'template': return { title: a.template?.name ?? '', imageUrl: null };
    case 'praatplaat': return { title: a.praatplaat?.name ?? '', imageUrl: a.praatplaat?.imageUrl ?? null };
    case 'storyboard': return { title: a.storyboard ? t(a.storyboard.nameKey) : '', imageUrl: a.storyboard?.coverImage ?? null };
    case 'free': return { title: a.free?.themeName ?? '', imageUrl: null };
  }
}

export function StudentViewModal({ isOpen, onClose, classCode }: StudentViewModalProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ActiveAssignment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const start = setTimeout(() => setLoading(true), 0);
    void getActiveAssignment(classCode).then((a) => {
      if (cancelled) return;
      setData(a);
      setLoading(false);
    });
    return () => { cancelled = true; clearTimeout(start); };
  }, [isOpen, classCode]);

  let content = <div className="py-10 text-center"><Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto" aria-hidden="true" /></div>;
  if (!loading && data) {
    const { title, imageUrl } = titleAndImage(data, t);
    const defaults = t(`assignmentCards.defaults.${data.type}.bullets`, { returnObjects: true }) as unknown;
    content = (
      <div className="flex justify-center">
        <StudentPreview
          title={title}
          imageUrl={imageUrl}
          type={data.type}
          cardTitle={data.card?.title ?? t(`assignmentCards.defaults.${data.type}.title`)}
          bullets={data.card?.bullets ?? (Array.isArray(defaults) ? defaults.map(String) : [])}
          durationLabel={data.durationLabel ?? undefined}
        />
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('teacher.classPage.prepare.studentView')} size="sm">
      {content}
    </Modal>
  );
}

export default StudentViewModal;
