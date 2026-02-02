/**
 * CreateClassModal - Modal voor het aanmaken van een nieuwe klas
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

interface CreateClassModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateClassModal({ onClose, onCreate }: CreateClassModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validatie
    if (!name.trim()) {
      setError('Voer een klasnaam in');
      return;
    }

    if (name.trim().length < 2) {
      setError('Klasnaam moet minimaal 2 tekens zijn');
      return;
    }

    try {
      setLoading(true);
      await onCreate(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Nieuwe Klas Aanmaken
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">
              Klasnaam
            </label>
            <input
              id="className"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Groep 5B of Muziekles 2025"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all text-gray-900 placeholder:text-gray-400"
              disabled={loading}
              autoFocus
            />
          </div>

          <p className="text-gray-500 text-sm mb-4">
            Na het aanmaken krijg je een unieke 4-cijferige code die je met je leerlingen kunt delen.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateClassModal;
