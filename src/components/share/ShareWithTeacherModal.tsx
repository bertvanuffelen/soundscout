/**
 * ShareWithTeacherModal - Modal voor leerlingen om compositie te delen met docent
 *
 * Flow:
 * 1. Leerling voert 4-cijferige klas-code in
 * 2. Leerling voert naam in (optioneel - krijgt grappige naam als leeg)
 * 3. Compositie wordt verzonden naar docent
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Send, PartyPopper, AlertCircle, Bird } from 'lucide-react';
import { Button } from '../ui/Button';
import { submitComposition, validateClassCode } from '../../lib/submissions';
import { canSubmit, markSubmission, getSubmitCooldownRemaining } from '../../utils/rateLimit';
import type { CompositionData } from '../../types';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ShareWithTeacherModalProps {
  compositionName: string;
  compositionData: CompositionData;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'code' | 'name' | 'sending' | 'success' | 'error';

export function ShareWithTeacherModal({
  compositionName,
  compositionData,
  onClose,
  onSuccess,
}: ShareWithTeacherModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('code');
  // Tijdens versturen niet met Escape te sluiten (de sluitknop is dan ook verborgen)
  const modalRef = useModalBehavior(onClose, { closeOnEscape: step !== 'sending' });
  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [finalStudentName, setFinalStudentName] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Rate limit countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil(getSubmitCooldownRemaining() / 1000);
      setCooldownSeconds(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Valideer klas-code en ga naar volgende stap
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie: 4 cijfers
    const cleanCode = classCode.trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      setError(t('teacher.shareWithTeacher.invalidCode'));
      return;
    }

    try {
      // Controleer of klas bestaat
      const classInfo = await validateClassCode(cleanCode);

      if (!classInfo) {
        setError(t('teacher.shareWithTeacher.classNotFound'));
        return;
      }

      setClassName(classInfo.name);
      setTeacherName(classInfo.teacher_name);
      setStep('name');
    } catch {
      setError(t('teacher.shareWithTeacher.sendError'));
    }
  };

  // Verzend compositie (met rate limiting)
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Rate limit check
    if (!canSubmit()) {
      const remaining = Math.ceil(getSubmitCooldownRemaining() / 1000);
      setCooldownSeconds(remaining);
      setError(t('submissions.cooldown', { seconds: remaining }));
      return;
    }

    setStep('sending');

    try {
      const result = await submitComposition({
        classCode: classCode.trim(),
        studentName: studentName.trim() || undefined, // undefined = random naam
        compositionName,
        compositionData,
      });

      markSubmission(); // Markeer succesvolle submission voor rate limiting
      setFinalStudentName(result.studentName);
      setStep('success');

      // Na 3 seconden sluiten
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.validation.genericError'));
      setStep('error');
    }
  };

  // Alleen cijfers toestaan in code veld
  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setClassCode(digitsOnly);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-main">
            {t('teacher.shareWithTeacher.title')}
          </h2>
          {step !== 'sending' && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-text-muted p-1"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Step 1: Code invoeren */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit}>
            <h3 className="font-medium text-text-main mb-2">{t('teacher.shareWithTeacher.step1Title')}</h3>
            <p className="text-text-muted mb-4">
              {t('teacher.shareWithTeacher.step1Description')}
            </p>

            {error && (
              <div className="bg-error-50 border border-error-200 text-error-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-muted mb-2">
                {t('teacher.shareWithTeacher.codePlaceholder')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={classCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="0000"
                className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-4 border-2 border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-transparent outline-none transition-all text-text-main placeholder:text-neutral-300"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={classCode.length !== 4}
                className="flex-1"
              >
                {t('teacher.shareWithTeacher.next')}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Naam invoeren */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit}>
            <h3 className="font-medium text-text-main mb-2">{t('teacher.shareWithTeacher.step2Title')}</h3>
            <div className="bg-success-50 border border-success-200 text-success-600 px-4 py-3 rounded-lg mb-4">
              <p className="font-medium flex items-center gap-1">
                <Check className="w-4 h-4" />
                {t('teacher.shareWithTeacher.step2Title')}
              </p>
              <p className="text-sm">{t('teacher.shareWithTeacher.className')}: {className}</p>
              <p className="text-sm">{t('teacher.shareWithTeacher.teacherName')}: {teacherName}</p>
            </div>

            <p className="text-text-muted mb-4">
              {t('teacher.shareWithTeacher.yourName')}
            </p>

            <div className="mb-2">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={t('teacher.shareWithTeacher.namePlaceholder')}
                className="w-full px-4 py-3 border border-border-subtle rounded-xl focus:ring-2 focus:ring-accent-400 focus:border-transparent outline-none transition-all text-text-main placeholder:text-neutral-400"
                autoFocus
              />
            </div>

            <p className="text-neutral-400 text-sm mb-6 flex items-center gap-1 flex-wrap">
              {t('teacher.shareWithTeacher.namePlaceholder')}
              <Bird className="w-4 h-4 text-accent-500" />
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setStep('code')}
                className="flex-1"
              >
                {t('common.back')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={cooldownSeconds > 0}
                className="flex-1"
              >
                {cooldownSeconds > 0
                  ? `${t('teacher.shareWithTeacher.send')} (${cooldownSeconds}s)`
                  : t('teacher.shareWithTeacher.send')}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Versturen */}
        {step === 'sending' && (
          <div className="text-center py-8">
            <Send className="w-12 h-12 text-accent-500 mx-auto mb-4 animate-bounce" />
            <p className="text-text-muted">
              {t('teacher.shareWithTeacher.sending')}
            </p>
          </div>
        )}

        {/* Step 4: Succes */}
        {step === 'success' && (
          <div className="text-center py-4">
            <PartyPopper className="w-16 h-16 text-accent-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-main mb-2">
              {t('teacher.shareWithTeacher.step3Title')}
            </h3>
            <p className="text-text-muted mb-2">
              {t('teacher.shareWithTeacher.step3Description')}
            </p>
            <p className="text-neutral-500 text-sm">
              {t('common.by')} <strong>{finalStudentName}</strong>
            </p>
          </div>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <div className="text-center py-4">
            <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-main mb-2">
              {t('error.title')}
            </h3>
            <p className="text-error-600 mb-4">
              {error}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStep('code')}
                className="flex-1"
              >
                {t('common.retry')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareWithTeacherModal;
