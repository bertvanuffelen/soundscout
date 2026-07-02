/**
 * LandingVideo — één demovideo-kaart op de publieke docentenpagina.
 *
 * Zelfde YouTube-patroon als TutorialScreen: eerst een thumbnail met play-overlay
 * (geen iframe → licht), pas na klik een ingebedde `youtube-nocookie`-player.
 * De twee provider-helpers staan hier lokaal zodat wisselen van provider
 * (YouTube → Vimeo) triviaal blijft.
 */

import { useState } from 'react';
import { Play } from 'lucide-react';

// --- Video provider helpers (pas deze twee aan om van provider te wisselen) ---

function thumbnailUrl(id: string): string {
  // YouTube: hqdefault = 480×360 (scherper dan mqdefault op grote kaarten)
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

interface LandingVideoProps {
  youtubeId: string;
  title: string;
  description: string;
  /** Toegankelijk label voor de play-knop, bv. "Speel video af". */
  playLabel: string;
}

export function LandingVideo({ youtubeId, title, description, playLabel }: LandingVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-900 shadow-lg border border-border-subtle">
        {isPlaying ? (
          <iframe
            src={embedUrl(youtubeId)}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            aria-label={`${playLabel}: ${title}`}
            className="group relative w-full h-full"
          >
            <img
              src={thumbnailUrl(youtubeId)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors">
              <span className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-brand-800 ml-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div>
        <h3 className="text-base font-bold text-text-main">{title}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
