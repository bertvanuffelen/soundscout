/**
 * EditorCanvas - Canvas for placing and dragging hotspots on background image
 *
 * Displays background image with hotspot markers.
 * Click anywhere to place a new hotspot.
 * Drag existing hotspots to reposition them.
 */

import { useCallback, useRef, useState } from 'react';
import type { EditorHotspot } from '../../pages/LocationEditor';

interface EditorCanvasProps {
  backgroundImage: string | null;
  hotspots: EditorHotspot[];
  pendingHotspot: { x: number; y: number } | null;
  onCanvasClick: (x: number, y: number) => void;
  onMoveHotspot: (id: string, x: number, y: number) => void;
}

export function EditorCanvas({
  backgroundImage,
  hotspots,
  pendingHotspot,
  onCanvasClick,
  onMoveHotspot,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // --- Convert pointer event to percentage coordinates ---
  const getPercentCoords = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      return { x, y };
    },
    [],
  );

  // --- Canvas click (only when not dragging) ---
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !backgroundImage || draggingId) return;
      const coords = getPercentCoords(e);
      if (coords) onCanvasClick(coords.x, coords.y);
    },
    [backgroundImage, onCanvasClick, draggingId, getPercentCoords],
  );

  // --- Hotspot drag ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, hotspotId: string) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDraggingId(hotspotId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId) return;
      const coords = getPercentCoords(e);
      if (coords) onMoveHotspot(draggingId, coords.x, coords.y);
    },
    [draggingId, getPercentCoords, onMoveHotspot],
  );

  const handlePointerUp = useCallback(() => {
    if (draggingId) {
      // Small delay to prevent click from firing after drag
      setTimeout(() => setDraggingId(null), 50);
    }
  }, [draggingId]);

  if (!backgroundImage) {
    return (
      <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
        <p className="text-slate-500 text-sm">
          Upload een achtergrondafbeelding om te beginnen
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden cursor-crosshair touch-none"
    >
      {/* Background image */}
      <img
        src={backgroundImage}
        alt="Location background"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Grid overlay for visual guidance */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '10% 10%',
          }}
        />
      </div>

      {/* Existing hotspots (draggable) */}
      {hotspots.map((hotspot, index) => (
        <div
          key={hotspot.id}
          className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 ${
            draggingId === hotspot.id
              ? 'cursor-grabbing z-30 scale-125'
              : 'cursor-grab z-10 hover:scale-110'
          } transition-transform`}
          style={{
            left: `${hotspot.x}%`,
            top: `${hotspot.y}%`,
          }}
          onPointerDown={(e) => handlePointerDown(e, hotspot.id)}
        >
          {/* Outer ring */}
          <div
            className={`absolute inset-0 rounded-full border-2 ${
              draggingId === hotspot.id
                ? 'border-green-400 bg-green-400/30'
                : hotspot.audioFile
                  ? 'border-emerald-400 bg-emerald-400/20'
                  : 'border-amber-400 bg-amber-400/20'
            }`}
          />
          {/* Number label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-lg">
              {index + 1}
            </span>
          </div>
        </div>
      ))}

      {/* Pending hotspot (being placed) */}
      {pendingHotspot && (
        <div
          className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
          style={{
            left: `${pendingHotspot.x}%`,
            top: `${pendingHotspot.y}%`,
          }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-green-400 bg-green-400/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white">?</span>
          </div>
        </div>
      )}

      {/* Click hint */}
      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
        <p className="text-xs text-white/70">
          Klik om te plaatsen · Sleep om te verplaatsen
        </p>
      </div>
    </div>
  );
}
