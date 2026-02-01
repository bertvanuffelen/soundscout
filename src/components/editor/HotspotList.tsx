/**
 * HotspotList - List of placed hotspots with delete functionality
 */

import { Trash2 } from 'lucide-react';
import type { EditorHotspot } from '../../pages/LocationEditor';

interface HotspotListProps {
  hotspots: EditorHotspot[];
  onDelete: (id: string) => void;
}

export function HotspotList({ hotspots, onDelete }: HotspotListProps) {
  if (hotspots.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
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
          className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2 group"
        >
          <div className="flex items-center gap-3">
            {/* Index number */}
            <span className="w-6 h-6 flex items-center justify-center bg-amber-400 text-slate-900 text-xs font-bold rounded-full">
              {index + 1}
            </span>

            {/* Sample ID */}
            <div>
              <p className="text-sm font-mono text-white">{hotspot.sampleId}</p>
              <p className="text-xs text-slate-500">
                x: {hotspot.x.toFixed(1)}% &nbsp; y: {hotspot.y.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={() => onDelete(hotspot.id)}
            className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Verwijderen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
