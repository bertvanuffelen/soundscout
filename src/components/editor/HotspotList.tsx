/**
 * HotspotList - List of placed hotspots with audio info, edit and delete
 */

import { Trash2, Music, Pencil } from 'lucide-react';
import type { EditorHotspot } from '../../pages/LocationEditor';

interface HotspotListProps {
  hotspots: EditorHotspot[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function HotspotList({ hotspots, onDelete, onEdit }: HotspotListProps) {
  if (hotspots.length === 0) {
    return (
      <div className="text-center py-8 text-brand-500 text-sm">
        Nog geen hotspots geplaatst.
        <br />
        Klik op de afbeelding om te beginnen.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {hotspots.map((hotspot, index) => (
        <div
          key={hotspot.id}
          className="flex items-center justify-between bg-brand-700/50 rounded-lg px-3 py-2 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Index number */}
            <span
              className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0 ${
                hotspot.audioFile
                  ? 'bg-success-400 text-brand-900'
                  : 'bg-accent-400 text-brand-900'
              }`}
            >
              {index + 1}
            </span>

            {/* Sample info */}
            <div className="min-w-0">
              <p className="text-sm font-mono text-white truncate">{hotspot.sampleId}</p>
              <div className="flex items-center gap-2 text-xs text-brand-500">
                <span>
                  x: {hotspot.x.toFixed(1)}% &nbsp; y: {hotspot.y.toFixed(1)}%
                </span>
                {hotspot.audioFile && (
                  <span className="flex items-center gap-1 text-success-400">
                    <Music size={10} />
                    {hotspot.duration ? `${hotspot.duration}s` : 'mp3'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
            <button
              onClick={() => onEdit(hotspot.id)}
              className="p-1.5 rounded hover:bg-accent-500/20 text-brand-500 hover:text-accent-400 transition-colors"
              title="Audio bewerken"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(hotspot.id)}
              className="p-1.5 rounded hover:bg-error-500/20 text-brand-500 hover:text-error-400 transition-colors"
              title="Verwijderen"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
