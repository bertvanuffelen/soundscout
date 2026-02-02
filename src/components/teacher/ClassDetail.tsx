/**
 * ClassDetail - Detail pagina voor een klas
 *
 * Toont alle composities van leerlingen in deze klas
 */

import { useState } from 'react';
import { ArrowLeft, RefreshCw, Loader2, Music } from 'lucide-react';
import type { TeacherClass } from '../../hooks/useClasses';
import { useSubmissions } from '../../hooks/useSubmissions';
import type { Submission } from '../../hooks/useSubmissions';
import { SubmissionCard } from './SubmissionCard';
import { SubmissionPlayer } from './SubmissionPlayer';
import { Button } from '../ui/Button';

interface ClassDetailProps {
  classData: TeacherClass;
  onBack: () => void;
}

export function ClassDetail({ classData, onBack }: ClassDetailProps) {
  const { submissions, loading, error, deleteSubmission, refetch } = useSubmissions(classData.id);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    // Korte delay voor visuele feedback
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze compositie wilt verwijderen?')) {
      return;
    }

    try {
      setActionError(null);
      await deleteSubmission(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Kon niet verwijderen');
    }
  };

  const handlePlay = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="bg-bg-surface border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-main text-sm mb-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar overzicht
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-main">
                {classData.name}
              </h1>
              <p className="text-sm text-text-muted">
                {submissions.length} {submissions.length === 1 ? 'compositie' : 'composities'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Ververs knop */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                title="Ververs composities"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              {/* Klas-code prominent weergeven */}
              <div className="text-center">
                <p className="text-xs text-text-muted uppercase tracking-wide">Klas-code</p>
                <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-xl font-mono font-bold text-2xl">
                  {classData.code}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Error message */}
        {(error || actionError) && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-xl mb-4">
            {error || actionError}
            <button
              onClick={() => { setActionError(null); refetch(); }}
              className="ml-2 underline"
            >
              Probeer opnieuw
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Composities laden...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && submissions.length === 0 && (
          <div className="bg-bg-surface rounded-2xl shadow-lg p-8 text-center">
            <Music className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-main mb-2">
              Nog geen composities
            </h3>
            <p className="text-text-muted mb-4">
              Deel de klas-code <strong className="font-mono text-text-main">{classData.code}</strong> met je leerlingen.
            </p>
            <p className="text-text-muted text-sm">
              Zodra leerlingen hun compositie delen, verschijnen ze hier.
            </p>
          </div>
        )}

        {/* Submissions list */}
        {!loading && submissions.length > 0 && (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onPlay={() => handlePlay(submission)}
                onDelete={() => handleDelete(submission.id)}
              />
            ))}
          </div>
        )}

        {/* Instructie box */}
        <div className="mt-8 bg-bg-surface rounded-xl p-4 text-center border border-border-subtle">
          <p className="text-text-muted text-sm">
            Leerlingen kunnen hun compositie delen via <strong className="text-text-main">Podium → Opslaan → Deel met docent</strong> en dan klas-code <strong className="font-mono text-text-main">{classData.code}</strong> invoeren.
          </p>
        </div>
      </main>

      {/* Player modal */}
      {selectedSubmission && (
        <SubmissionPlayer
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
}

export default ClassDetail;
