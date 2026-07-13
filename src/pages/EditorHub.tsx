/**
 * EditorHub - Toegangspunt voor de content-authoring-tools (/editor, dev-only)
 *
 * Twee tabs:
 * - Thema-wizard: van thema-idee → prompts → kaart & code-export (week 4)
 * - Locatie-editor: hotspots plaatsen + audio koppelen per locatie (bestaand)
 */

import { useState } from 'react';
import { Wand2, MapPin } from 'lucide-react';
import { ThemeWizard } from './ThemeWizard';
import { LocationEditor } from './LocationEditor';

type EditorTab = 'wizard' | 'locations';

export function EditorHub() {
  // Deep-link: /editor?location=x opent direct de locatie-editor (bestaand gedrag)
  const [tab, setTab] = useState<EditorTab>(() =>
    new URLSearchParams(window.location.search).has('location') ? 'locations' : 'wizard'
  );

  return (
    <div className="min-h-screen bg-bg-app">
      <div className="bg-brand-900 text-white px-4 py-2 flex items-center gap-3">
        <span className="font-extrabold tracking-tight">SoundScout · Editor</span>
        <nav className="flex gap-1">
          <button
            onClick={() => setTab('wizard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === 'wizard' ? 'bg-accent-400 text-accent-900' : 'text-brand-200 hover:bg-brand-800'
            }`}
          >
            <Wand2 size={14} /> Thema-wizard
          </button>
          <button
            onClick={() => setTab('locations')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === 'locations' ? 'bg-accent-400 text-accent-900' : 'text-brand-200 hover:bg-brand-800'
            }`}
          >
            <MapPin size={14} /> Locatie-editor
          </button>
        </nav>
      </div>
      {tab === 'wizard' ? <ThemeWizard /> : <LocationEditor />}
    </div>
  );
}

export default EditorHub;
