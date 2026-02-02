/**
 * ShareWithTeacherModal - Modal voor leerlingen om compositie te delen met docent
 *
 * Flow:
 * 1. Leerling voert 4-cijferige klas-code in
 * 2. Leerling voert naam in (optioneel - krijgt grappige naam als leeg)
 * 3. Compositie wordt verzonden naar docent
 */

import { useState } from 'react';
import { X, Check, Send, PartyPopper, AlertCircle, Bird } from 'lucide-react';
import { Button } from '../ui/Button';
import { submitComposition, validateClassCode } from '../../lib/submissions';

interface ShareWithTeacherModalProps {
  compositionName: string;
  compositionData: any;
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
  const [step, setStep] = useState<Step>('code');
  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [finalStudentName, setFinalStudentName] = useState('');

  // Valideer klas-code en ga naar volgende stap
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie: 4 cijfers
    const cleanCode = classCode.trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      setError('Voer een geldige 4-cijferige code in');
      return;
    }

    try {
      // Controleer of klas bestaat
      const classInfo = await validateClassCode(cleanCode);

      if (!classInfo) {
        setError('Deze klas-code bestaat niet. Controleer de code en probeer opnieuw.');
        return;
      }

      setClassName(classInfo.name);
      setTeacherName(classInfo.teacher_name);
      setStep('name');
    } catch (err) {
      setError('Kon klas niet controleren. Probeer opnieuw.');
    }
  };

  // Verzend compositie
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('sending');

    try {
      const result = await submitComposition({
        classCode: classCode.trim(),
        studentName: studentName.trim() || undefined, // undefined = random naam
        compositionName,
        compositionData,
      });

      setFinalStudentName(result.studentName);
      setStep('success');

      // Na 3 seconden sluiten
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
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
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Deel met docent
          </h2>
          {step !== 'sending' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Step 1: Code invoeren */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit}>
            <p className="text-gray-600 mb-4">
              Voer de klas-code in die je van je docent hebt gekregen.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Klas-code (4 cijfers)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={classCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="0000"
                className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-300"
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
                Annuleren
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={classCode.length !== 4}
                className="flex-1"
              >
                Volgende
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Naam invoeren */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit}>
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              <p className="font-medium flex items-center gap-1">
                <Check className="w-4 h-4" />
                Klas gevonden!
              </p>
              <p className="text-sm">{className} van {teacherName}</p>
            </div>

            <p className="text-gray-600 mb-4">
              Hoe heet je? (niet verplicht)
            </p>

            <div className="mb-2">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Je naam..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
                autoFocus
              />
            </div>

            <p className="text-gray-400 text-sm mb-6 flex items-center gap-1 flex-wrap">
              Geen naam invullen? Dan krijg je een grappige naam zoals "Vrolijke Papegaai"
              <Bird className="w-4 h-4 text-amber-500" />
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setStep('code')}
                className="flex-1"
              >
                Terug
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex-1"
              >
                Versturen
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Versturen */}
        {step === 'sending' && (
          <div className="text-center py-8">
            <Send className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
            <p className="text-gray-600">
              Je compositie wordt verstuurd...
            </p>
          </div>
        )}

        {/* Step 4: Succes */}
        {step === 'success' && (
          <div className="text-center py-4">
            <PartyPopper className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Verstuurd!
            </h3>
            <p className="text-gray-600 mb-2">
              Je compositie "<strong>{compositionName}</strong>" is gedeeld met je docent.
            </p>
            <p className="text-gray-500 text-sm">
              Je naam: <strong>{finalStudentName}</strong>
            </p>
          </div>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <div className="text-center py-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Oeps!
            </h3>
            <p className="text-red-600 mb-4">
              {error}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStep('code')}
                className="flex-1"
              >
                Probeer opnieuw
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                Sluiten
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareWithTeacherModal;
