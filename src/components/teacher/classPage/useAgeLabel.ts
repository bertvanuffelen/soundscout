/**
 * useAgeLabel — "net / 8 min / 3 uur / 13 okt" voor tegels en lijsten op de
 * klaspagina en in het feedbackscherm.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { relativeAge } from '../../../lib/submissionDisplay';

export function useAgeLabel() {
  const { t } = useTranslation();
  return useCallback((ms: number) => {
    const age = relativeAge(ms);
    switch (age.unit) {
      case 'justNow': return t('teacher.classPage.time.justNow');
      case 'minutes': return t('teacher.classPage.time.minutes', { count: age.count });
      case 'hours': return t('teacher.classPage.time.hours', { count: age.count });
      case 'date':
        return age.date.toLocaleDateString(t('common.dateLocale'), { day: 'numeric', month: 'short' });
    }
  }, [t]);
}
