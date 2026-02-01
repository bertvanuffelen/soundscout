/**
 * HotspotModal - Modal for entering sample ID when placing a hotspot
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from '../ui';

interface HotspotModalProps {
  isOpen: boolean;
  locationId: string;
  onConfirm: (sampleId: string) => void;
  onCancel: () => void;
}

export function HotspotModal({
  isOpen,
  locationId,
  onConfirm,
  onCancel,
}: HotspotModalProps) {
  const [sampleId, setSampleId] = useState('');

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSampleId('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (sampleId.trim()) {
        onConfirm(sampleId.trim().toLowerCase().replace(/\s+/g, '-'));
      }
    },
    [sampleId, onConfirm]
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
            disabled={!sampleId.trim()}
            className="flex-1"
          >
            Toevoegen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
