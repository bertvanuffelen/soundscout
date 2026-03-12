/**
 * HotspotModal - Modal for entering sample ID + uploading MP3 when placing a hotspot
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Music, X } from 'lucide-react';
import { Modal, Button } from '../ui';

interface HotspotModalProps {
  isOpen: boolean;
  locationId: string;
  onConfirm: (sampleId: string, audioFile?: File, audioUrl?: string, duration?: number) => void;
  onCancel: () => void;
}

/** Get audio duration using Web Audio API */
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext();
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
        const duration = Math.round(buffer.duration * 10) / 10;
        audioContext.close();
        resolve(duration);
      } catch (err) {
        audioContext.close();
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function HotspotModal({
  isOpen,
  locationId,
  onConfirm,
  onCancel,
}: HotspotModalProps) {
  const [sampleId, setSampleId] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSampleId('');
      setAudioFile(null);
      setAudioUrl(null);
      setDuration(null);
    }
  }, [isOpen]);

  // Clean up object URL on unmount or change
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingAudio(true);
    setAudioFile(file);

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Auto-fill sample ID from filename if empty
    if (!sampleId) {
      const name = file.name
        .replace(/\.mp3$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSampleId(name);
    }

    // Get duration
    try {
      const dur = await getAudioDuration(file);
      setDuration(dur);
    } catch {
      setDuration(null);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [sampleId]);

  const handleRemoveAudio = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [audioUrl]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (sampleId.trim()) {
        onConfirm(
          sampleId.trim().toLowerCase().replace(/\s+/g, '-'),
          audioFile ?? undefined,
          audioUrl ?? undefined,
          duration ?? undefined,
        );
      }
    },
    [sampleId, audioFile, audioUrl, duration, onConfirm],
  );

  const prefix = locationId ? `${locationId}-` : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Nieuwe Hotspot"
      size="sm"
      className="bg-slate-800 border-slate-700 text-white"
    >
      <form onSubmit={handleSubmit}>
        {/* Sample ID */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            Sample ID
          </label>
          <div className="flex items-center gap-2">
            {prefix && (
              <span className="text-slate-500 text-sm font-mono">{prefix}</span>
            )}
            <input
              type="text"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              placeholder="bijv. golven"
              autoFocus
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 font-mono"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Volledige ID wordt: <span className="font-mono text-amber-400">{prefix}{sampleId || '...'}</span>
          </p>
        </div>

        {/* MP3 Upload */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            Audio bestand (optioneel)
          </label>

          {!audioFile ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,.mp3"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600"
              >
                <Upload size={16} className="mr-1.5" />
                MP3 uploaden
              </Button>
            </div>
          ) : (
            <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Music size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-white truncate">{audioFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAudio}
                  className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {isLoadingAudio ? (
                <p className="text-xs text-slate-500">Laden...</p>
              ) : (
                <>
                  {duration !== null && (
                    <p className="text-xs text-slate-400">
                      Duur: <span className="text-emerald-400 font-mono">{duration}s</span>
                    </p>
                  )}
                  {audioUrl && (
                    <audio
                      src={audioUrl}
                      controls
                      className="w-full h-8 mt-1"
                      style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.8)' }}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600"
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!sampleId.trim() || isLoadingAudio}
            className="flex-1"
          >
            Toevoegen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
