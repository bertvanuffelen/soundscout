/**
 * HotspotList - List of placed hotspots with audio info, edit and delete
 */

import { useEffect, useRef, useState } from 'react';
import { Trash2, Music, Pencil, Play, Square } from 'lucide-react';
import type { EditorHotspot } from '../../pages/LocationEditor';

interface HotspotListProps {
  hotspots: EditorHotspot[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  /** Thema + locatie om het audiopad van bestaande samples af te leiden */
  themeId?: string;
  locationId?: string;
}

/**
 * Pad naar de al gekoppelde mp3. Zelfde conventie als generateJson() in de
 * LocationEditor: /audio/themes/{theme}/{locatie}/{sampleId-zonder-locatieprefix}.mp3
 * Bij een net geüpload bestand gebruiken we een object-URL, want dat staat nog
 * niet op de server.
 */
function audioPad(hotspot: EditorHotspot, themeId?: string, locationId?: string): string | null {
  if (hotspot.audioFile) return URL.createObjectURL(hotspot.audioFile);
  if (!themeId || !locationId) return null;
  // Bestandsnaam = de VOLLEDIGE sampleId, inclusief locatieprefix
  // (bv. haven-meeuwen.mp3). generateJson() in de LocationEditor strípt die
  // prefix juist — dat levert daar een audioUrl op die niet bestaat.
  return `/audio/themes/${themeId}/${locationId}/${hotspot.sampleId}.mp3`;
}

export function HotspotList({ hotspots, onDelete, onEdit, themeId, locationId }: HotspotListProps) {
  const [spelend, setSpelend] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop het geluid als de lijst verdwijnt, anders speelt het door
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const speelAf = (hotspot: EditorHotspot) => {
    audioRef.current?.pause();
    if (spelend === hotspot.id) {
      setSpelend(null);
      return;
    }
    const pad = audioPad(hotspot, themeId, locationId);
    if (!pad) return;
    const audio = new Audio(pad);
    audioRef.current = audio;
    audio.onended = () => setSpelend(null);
    // Ontbreekt het bestand (nog), zeg dat eerlijk in plaats van stil te falen
    audio.onerror = () => { setSpelend(null); alert(`Geen audio gevonden op ${pad}`); };
    audio.play().then(() => setSpelend(hotspot.id)).catch(() => setSpelend(null));
  };

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
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => speelAf(hotspot)}
              className={`p-1.5 rounded transition-colors ${
                spelend === hotspot.id
                  ? 'bg-accent-500/30 text-accent-300'
                  : 'text-brand-400 hover:bg-accent-500/20 hover:text-accent-400'
              }`}
              title={spelend === hotspot.id ? 'Stoppen' : 'Geluid beluisteren'}
            >
              {spelend === hotspot.id ? <Square size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => onEdit(hotspot.id)}
              className="p-1.5 rounded hover:bg-accent-500/20 text-brand-500 hover:text-accent-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Audio bewerken"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(hotspot.id)}
              className="p-1.5 rounded hover:bg-error-500/20 text-brand-500 hover:text-error-400 transition-colors opacity-0 group-hover:opacity-100"
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
