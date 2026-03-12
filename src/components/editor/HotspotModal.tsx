/**
 * HotspotModal - Modal for creating a new hotspot or editing audio on an existing one
 *
 * Two modes:
 * - New: enter sample ID + optional MP3 upload
 * - Edit: only MP3 upload/replace (sample ID is read-only)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Music, X } from 'lucide-react';
import { Modal, Button } from '../ui';
import type { EditorHotspot } from '../../pages/LocationEditor';

interface HotspotModalProps {
  isOpen: boolean;
  locationId: string;
  /** When set, modal opens in edit mode for this hotspot */
  editHotspot?: EditorHotspot;
  /** Called when creating a new hotspot */
  onConfirm: (sampleId: string, audioFile?: File, audioUrl?: string, duration?: number) => void;
  /** Called when updating audio on an existing hotspot */
  onUpdate: (audioFile?: File, audioUrl?: string, duration?: number) => void;
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
  editHotspot,
  onConfirm,
  onUpdate,
  onCancel,
}: HotspotModalProps) {
  const isEditMode = !!editHotspot;
  const [sampleId, setSampleId] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset/populate input when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editHotspot) {
        // Edit mode: pre-populate with existing data
        setSampleId(editHotspot.sampleId);
        setAudioFile(editHotspot.audioFile ?? null);
        setAudioUrl(editHotspot.audioUrl ?? null);
        setDuration(editHotspot.duration ?? null);
      } else {
        // New mode: reset everything
        setSampleId('');
        setAudioFile(null);
        setAudioUrl(null);
        setDuration(null);
      }
    }
  }, [isOpen, editHotspot]);

  // Clean up object URL on unmount or change
  useEffect(() => {
    return () => {
      // Only revoke URLs we created (not ones from editHotspot)
      if (audioUrl && audioUrl !== editHotspot?.audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, editHotspot?.audioUrl]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingAudio(true);
    setAudioFile(file);

    // Revoke old URL if we created it
    if (audioUrl && audioUrl !== editHotspot?.audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Auto-fill sample ID from filename if empty (new mode only)
    if (!isEditMode && !sampleId) {
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
  }, [sampleId, isEditMode, audioUrl, editHotspot?.audioUrl]);

  const handleRemoveAudio = useCallback(() => {
    if (audioUrl && audioUrl !== editHotspot?.audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [audioUrl, editHotspot?.audioUrl]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isEditMode) {
        onUpdate(
          audioFile ?? undefined,
          audioUrl ?? undefined,
          duration ?? undefined,
        );
      } else if (sampleId.trim()) {
        onConfirm(
          sampleId.trim().toLowerCase().replace(/\s+/g, '-'),
          audioFile ?? undefined,
          audioUrl ?? undefined,
          duration ?? undefined,
        );
      }
    },
    [isEditMode, sampleId, audioFile, audioUrl, duration, onConfirm, onUpdate],
  );

  const prefix = locationId ? `${locationId}-` : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={isEditMode ? `Audio — ${editHotspot.sampleId}` : 'Nieuwe Hotspot'}
      size="sm"
      className="bg-slate-800 border-slate-700 text-white"
    >
      <form onSubmit={handleSubmit}>
        {/* Sample ID — only editable in new mode */}
        {!isEditMode && (
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
        )}

        {/* MP3 Upload */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            {isEditMode ? 'Audio bestand' : 'Audio bestand (optioneel)'}
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
            disabled={(!isEditMode && !sampleId.trim()) || isLoadingAudio}
            className="flex-1"
          >
            {isEditMode ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
