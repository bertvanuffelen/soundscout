/**
 * LocationEditor - Admin tool for creating/editing location hotspots
 *
 * Accessible via /editor URL (not part of main game flow)
 * Features:
 * - Upload background image
 * - Click to place hotspots with x/y coordinates
 * - Enter sample IDs for each hotspot
 * - Export as JSON for use in codebase
 * - Load existing location to edit
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useThemeStore } from '../stores/themeStore';
import type { Location } from '../types';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { HotspotList } from '../components/editor/HotspotList';
import { HotspotModal } from '../components/editor/HotspotModal';
import { JsonExportPanel } from '../components/editor/JsonExportPanel';
import { Button } from '../components/ui';
import { Upload, RotateCcw } from 'lucide-react';

// --- Types ---

export interface EditorHotspot {
  id: string;
  sampleId: string;
  x: number;
  y: number;
}

interface PendingHotspot {
  x: number;
  y: number;
}

// --- Component ---

export function LocationEditor() {
  // Theme store for loading existing locations
  const getLocationById = useThemeStore((s) => s.getLocationById);
  const getLocations = useThemeStore((s) => s.getLocations);
  const locations = getLocations();

  // Form state
  const [themeId, setThemeId] = useState('basis');
  const [locationId, setLocationId] = useState('');
  const [nameNl, setNameNl] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionNl, setDescriptionNl] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundFileName, setBackgroundFileName] = useState('');

  // Hotspots state
  const [hotspots, setHotspots] = useState<EditorHotspot[]>([]);

  // Modal state
  const [pendingHotspot, setPendingHotspot] = useState<PendingHotspot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load location from URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const locationParam = params.get('location');
    if (locationParam) {
      loadExistingLocation(locationParam);
    }
  }, []);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackgroundFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (!backgroundImage) return;

    setPendingHotspot({ x, y });
    setIsModalOpen(true);
  }, [backgroundImage]);

  const handleModalConfirm = useCallback((sampleId: string) => {
    if (!pendingHotspot) return;

    const fullSampleId = locationId ? `${locationId}-${sampleId}` : sampleId;

    const newHotspot: EditorHotspot = {
      id: crypto.randomUUID(),
      sampleId: fullSampleId,
      x: pendingHotspot.x,
      y: pendingHotspot.y,
    };

    setHotspots((prev) => [...prev, newHotspot]);
    setPendingHotspot(null);
    setIsModalOpen(false);
  }, [pendingHotspot, locationId]);

  const handleModalCancel = useCallback(() => {
    setPendingHotspot(null);
    setIsModalOpen(false);
  }, []);

  const handleDeleteHotspot = useCallback((id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleReset = useCallback(() => {
    if (!confirm('Weet je zeker dat je alles wilt resetten?')) return;

    setThemeId('basis');
    setLocationId('');
    setNameNl('');
    setNameEn('');
    setDescriptionNl('');
    setDescriptionEn('');
    setBackgroundImage(null);
    setBackgroundFileName('');
    setHotspots([]);
  }, []);

  const loadExistingLocation = useCallback((locId: string) => {
    const location = getLocationById(locId);
    if (!location) {
      alert(`Locatie "${locId}" niet gevonden`);
      return;
    }

    setLocationId(location.id);
    setNameNl(location.name); // This is the i18n key, we show it as-is
    setDescriptionNl(location.description);
    setBackgroundImage(location.backgroundImage);
    setBackgroundFileName(location.backgroundImage.split('/').pop() || '');

    // Convert hotspots
    const editorHotspots: EditorHotspot[] = location.hotspots.map((h) => ({
      id: h.id,
      sampleId: h.sampleId,
      x: h.x,
      y: h.y,
    }));
    setHotspots(editorHotspots);
  }, [getLocationById]);

  // --- Generate JSON ---

  const generateJson = useCallback(() => {
    return {
      location: {
        id: locationId,
        name: `locations.${locationId}.name`,
        description: `locations.${locationId}.description`,
        backgroundImage: `/images/themes/${themeId}/${locationId}.png`,
        ambientAudio: '',
        hotspots: hotspots.map((h) => ({
          id: h.sampleId,
          x: Math.round(h.x * 10) / 10,
          y: Math.round(h.y * 10) / 10,
          radius: 8,
          sampleId: h.sampleId,
          visualHint: 'pulse',
        })),
        unlocked: true,
      },
      i18n: {
        nl: {
          [`locations.${locationId}.name`]: nameNl,
          [`locations.${locationId}.description`]: descriptionNl,
          ...Object.fromEntries(
            hotspots.map((h) => [`samples.${h.sampleId}`, h.sampleId.split('-').pop() || h.sampleId])
          ),
        },
        en: {
          [`locations.${locationId}.name`]: nameEn || nameNl,
          [`locations.${locationId}.description`]: descriptionEn || descriptionNl,
          ...Object.fromEntries(
            hotspots.map((h) => [`samples.${h.sampleId}`, h.sampleId.split('-').pop() || h.sampleId])
          ),
        },
      },
      sampleStubs: hotspots.map((h) => ({
        id: h.sampleId,
        name: `samples.${h.sampleId}`,
        locationId: locationId,
        audioUrl: `/audio/themes/${themeId}/${locationId}/${h.sampleId.replace(`${locationId}-`, '')}.mp3`,
        duration: 0,
        icon: '?',
        color: '#000000',
      })),
      _meta: {
        generated: new Date().toISOString(),
        note: 'Fill in duration, icon, and color for each sample manually',
      },
    };
  }, [themeId, locationId, nameNl, nameEn, descriptionNl, descriptionEn, hotspots]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-amber-400">
            🗺️ Locatie Editor
          </h1>
          <div className="flex items-center gap-3">
            {/* Load existing location dropdown */}
            <select
              onChange={(e) => e.target.value && loadExistingLocation(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Laad bestaande locatie...
              </option>
              {locations.map((loc: Location) => (
                <option key={loc.id} value={loc.id}>
                  {loc.id}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-slate-400 hover:text-white"
            >
              <RotateCcw size={16} className="mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Form + Canvas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location metadata form */}
            <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Locatie Gegevens
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Theme ID
                  </label>
                  <input
                    type="text"
                    value={themeId}
                    onChange={(e) => setThemeId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="bijv. basis, kerst"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Location ID
                  </label>
                  <input
                    type="text"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="bijv. strand"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Achtergrond
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Upload size={16} className="mr-1" />
                      {backgroundFileName || 'Kies bestand'}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Naam (NL)
                  </label>
                  <input
                    type="text"
                    value={nameNl}
                    onChange={(e) => setNameNl(e.target.value)}
                    placeholder="Het Strand"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Naam (EN)
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="The Beach"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Beschrijving (NL)
                  </label>
                  <input
                    type="text"
                    value={descriptionNl}
                    onChange={(e) => setDescriptionNl(e.target.value)}
                    placeholder="Een zonnig strand..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Beschrijving (EN)
                  </label>
                  <input
                    type="text"
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder="A sunny beach..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </section>

            {/* Canvas for hotspot placement */}
            <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Hotspots Plaatsen
                {!backgroundImage && (
                  <span className="ml-2 text-amber-500 normal-case font-normal">
                    (upload eerst een achtergrond)
                  </span>
                )}
              </h2>
              <EditorCanvas
                backgroundImage={backgroundImage}
                hotspots={hotspots}
                pendingHotspot={pendingHotspot}
                onCanvasClick={handleCanvasClick}
              />
            </section>
          </div>

          {/* Right column: Hotspot list + Export */}
          <div className="space-y-6">
            {/* Hotspot list */}
            <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Hotspots ({hotspots.length})
              </h2>
              <HotspotList
                hotspots={hotspots}
                onDelete={handleDeleteHotspot}
              />
            </section>

            {/* JSON Export */}
            <section className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Export
              </h2>
              <JsonExportPanel
                generateJson={generateJson}
                locationId={locationId}
                isValid={locationId.length > 0 && hotspots.length > 0}
              />
            </section>
          </div>
        </div>
      </main>

      {/* Hotspot modal */}
      <HotspotModal
        isOpen={isModalOpen}
        locationId={locationId}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
