/**
 * PraatplaatSpot - Individueel icoon op de praatplaat (#72)
 *
 * Toont een luidspreker-icoon op x,y-positie.
 * Bij meerdere submissions op dezelfde plek: getal in badge.
 * Hover toont leerlingnaam.
 */

import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { PraatplaatSubmission } from '../../lib/praatplaat';

interface PraatplaatSpotProps {
  submissions: PraatplaatSubmission[];
  x: number; // 0-1 genormaliseerd
  y: number; // 0-1 genormaliseerd
  isPlaying: boolean;
  onClick: () => void;
}

export function PraatplaatSpot({ submissions, x, y, isPlaying, onClick }: PraatplaatSpotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const count = submissions.length;
  const label = count === 1 ? submissions[0].student_name : `${count}`;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-20">
          <div className="bg-black/80 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
            {count === 1
              ? submissions[0].student_name
              : submissions.map((s) => s.student_name).join(', ')
            }
          </div>
        </div>
      )}

      {/* Icoon */}
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
          transition-all duration-200 cursor-pointer
          ${isPlaying
            ? 'bg-accent-500 shadow-lg shadow-accent-500/40 scale-110 animate-pulse'
            : 'bg-white/90 hover:bg-white hover:scale-110 shadow-md'
          }
        `}
        aria-label={label}
      >
        <Volume2 className={`w-5 h-5 sm:w-6 sm:h-6 ${isPlaying ? 'text-white' : 'text-slate-700'}`} />

        {/* Badge voor meerdere submissions */}
        {count > 1 && (
          <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1 ${
            isPlaying ? 'bg-white text-accent-600' : 'bg-accent-500 text-white'
          }`}>
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

export default PraatplaatSpot;
