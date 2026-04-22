/**
 * ClassCodeOverlay - Fullscreen code display for projector mode
 *
 * Shows a 4-digit class code in very large text on a dark background,
 * suitable for displaying on a digital whiteboard (digibord).
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

interface ClassCodeOverlayProps {
  code: string;
  onClose: () => void;
}

export function ClassCodeOverlay({ code, onClose }: ClassCodeOverlayProps) {
  const { t } = useTranslation();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-brand-900 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Label */}
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8 tracking-wide">
          {t('teacher.classCodeOverlay.label')}
        </h2>

        {/* Code in very large text */}
        <div className="text-9xl sm:text-[200px] font-bold text-white tracking-widest font-mono mb-12">
          {code}
        </div>

        {/* Close button */}
        <Button
          variant="secondary"
          size="lg"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-white bg-brand-700 hover:bg-brand-600"
        >
          <X className="w-5 h-5" />
          {t('common.close')}
        </Button>
      </div>

      {/* Hint text at bottom */}
      <div className="absolute bottom-4 text-white text-sm opacity-60">
        {t('teacher.classCodeOverlay.escapeHint')}
      </div>
    </div>
  );
}

export default ClassCodeOverlay;
