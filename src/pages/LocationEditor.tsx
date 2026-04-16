/**
 * LocationEditor - Admin tool for creating/editing location hotspots
 *
 * Accessible via /editor URL (not part of main game flow)
 * Features:
 * - Upload background image
 * - Click to place hotspots with x/y coordinates
 * - Enter sample IDs for each hotspot
 * - MP3 upload per hotspot with auto-duration detection
 * - Drag-and-drop hotspot repositioning
 * - Export as JSON for use in codebase
 * - Load existing location to edit (all themes)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/themeStore';
import { getAllLocationsByTheme } from '../data/themes';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { HotspotList } from '../components/editor/HotspotList';
import { HotspotModal } from '../components/editor/HotspotModal';
import { JsonExportPanel } from '../components/editor/JsonExportPanel';
import { Button, Modal } from '../components/ui';
import { Upload, RotateCcw, HelpCircle } from 'lucide-react';

// --- Types ---

export interface EditorHotspot {
  id: string;
  sampleId: string;
  x: number;
  y: number;
  audioFile?: File;
  audioUrl?: string;
  duration?: number;
}

interface PendingHotspot {
  x: number;
  y: number;
}

// --- Component ---

export function LocationEditor() {
  const { t, i18n } = useTranslation();

  // Theme store — init required since editor lives outside AppContent
  const initTheme = useThemeStore((s) => s.initTheme);
  const isInitialized = useThemeStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) initTheme();
  }, [isInitialized, initTheme]);

  // All locations across all themes
  const allThemeLocations = getAllLocationsByTheme();

  // --- Form state ---
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
  const [editingHotspotId, setEditingHotspotId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Locations for the selected theme (derived)
  const themeLocations = useMemo(
    () => allThemeLocations.find((g) => g.themeId === themeId)?.locations ?? [],
    [allThemeLocations, themeId],
  );

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

  // --- Helpers ---

  /** Translate an i18n key, falling back to the raw key if not found */
  const translateKey = useCallback(
    (key: string, lang?: string): string => {
      if (!key) return '';
      const translation = lang
        ? i18n.getFixedT(lang)(key)
        : t(key);
      // If the translation is the same as the key, it wasn't found
      return translation === key ? '' : translation;
    },
    [t, i18n],
  );

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

  const handleModalConfirm = useCallback((sampleId: string, audioFile?: File, audioUrl?: string, duration?: number) => {
    if (!pendingHotspot) return;

    const fullSampleId = locationId ? `${locationId}-${sampleId}` : sampleId;

    const newHotspot: EditorHotspot = {
      id: crypto.randomUUID(),
      sampleId: fullSampleId,
      x: pendingHotspot.x,
      y: pendingHotspot.y,
      audioFile,
      audioUrl,
      duration,
    };

    setHotspots((prev) => [...prev, newHotspot]);
    setPendingHotspot(null);
    setIsModalOpen(false);
  }, [pendingHotspot, locationId]);

  const handleMoveHotspot = useCallback((id: string, x: number, y: number) => {
    setHotspots((prev) =>
      prev.map((h) => (h.id === id ? { ...h, x, y } : h)),
    );
  }, []);

  const handleEditHotspot = useCallback((id: string) => {
    setEditingHotspotId(id);
    setIsModalOpen(true);
  }, []);

  const handleUpdateHotspot = useCallback((audioFile?: File, audioUrl?: string, duration?: number) => {
    if (!editingHotspotId) return;
    setHotspots((prev) =>
      prev.map((h) =>
        h.id === editingHotspotId
          ? { ...h, audioFile, audioUrl, duration }
          : h,
      ),
    );
    setEditingHotspotId(null);
    setIsModalOpen(false);
  }, [editingHotspotId]);

  const handleModalCancel = useCallback(() => {
    setPendingHotspot(null);
    setEditingHotspotId(null);
    setIsModalOpen(false);
  }, []);

  const handleDeleteHotspot = useCallback((id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleReset = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    setShowResetModal(false);

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
    // Find location across all themes
    for (const group of allThemeLocations) {
      const loc = group.locations.find((l) => l.id === locId);
      if (loc) {
        setThemeId(group.themeId);
        setLocationId(loc.id);

        // Translate i18n keys to actual text
        setNameNl(translateKey(loc.name, 'nl'));
        setNameEn(translateKey(loc.name, 'en'));
        setDescriptionNl(translateKey(loc.description, 'nl'));
        setDescriptionEn(translateKey(loc.description, 'en'));

        setBackgroundImage(loc.backgroundImage);
        setBackgroundFileName(loc.backgroundImage.split('/').pop() || '');

        // Convert hotspots
        setHotspots(loc.hotspots.map((h) => ({
          id: h.id,
          sampleId: h.sampleId,
          x: h.x,
          y: h.y,
        })));
        return;
      }
    }

    alert(`Locatie "${locId}" niet gevonden`);
  }, [allThemeLocations, translateKey]);

  const handleThemeChange = useCallback((newThemeId: string) => {
    setThemeId(newThemeId);
    // Don't reset other fields — user might be creating a new location in this theme
  }, []);

  const handleLocationSelect = useCallback((locId: string) => {
    if (locId) loadExistingLocation(locId);
  }, [loadExistingLocation]);

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
        duration: h.duration ?? 0,
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
            Locatie Editor
          </h1>
          <div className="flex items-center gap-3">
            {/* Theme selector */}
            <select
              value={themeId}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              {allThemeLocations.map((group) => (
                <option key={group.themeId} value={group.themeId}>
                  {group.themeId}
                </option>
              ))}
            </select>

            {/* Location selector (filtered by selected theme) */}
            <select
              onChange={(e) => handleLocationSelect(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              value=""
            >
              <option value="" disabled>
                Laad locatie...
              </option>
              {themeLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.id}
                </option>
              ))}
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="text-slate-400 hover:text-amber-400"
              title="Handleiding"
            >
              <HelpCircle size={16} />
            </Button>
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
                onMoveHotspot={handleMoveHotspot}
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
                onEdit={handleEditHotspot}
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

      {/* Help modal */}
      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Handleiding Locatie Editor"
        size="lg"
        className="max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-5 text-sm text-slate-700 leading-relaxed">
          <section>
            <h3 className="font-bold text-base text-slate-900 mb-2">Nieuwe locatie aanmaken</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Kies het juiste <strong>thema</strong> in de header dropdown (bijv. "basis" of "winterspelen").</li>
              <li>Vul een <strong>Location ID</strong> in (lowercase, met koppeltekens, bijv. "strand").</li>
              <li>Vul de <strong>naam</strong> en <strong>beschrijving</strong> in voor NL en EN.</li>
              <li>Upload een <strong>achtergrondafbeelding</strong> (PNG/JPG, idealiter 16:9 verhouding).</li>
              <li><strong>Klik op de afbeelding</strong> om hotspots te plaatsen.</li>
              <li>Geef elke hotspot een <strong>Sample ID</strong> (wordt automatisch voorafgegaan door de Location ID).</li>
              <li>Upload optioneel direct een <strong>MP3 bestand</strong> — de duur wordt automatisch gedetecteerd.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-base text-slate-900 mb-2">Bestaande locatie bewerken</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Selecteer het <strong>thema</strong> in de eerste dropdown.</li>
              <li>Kies de <strong>locatie</strong> in de tweede dropdown ("Laad locatie...").</li>
              <li>Alle velden en hotspots worden automatisch ingeladen.</li>
              <li>Klik op het <strong>potlood-icoon</strong> naast een hotspot om audio toe te voegen of te vervangen.</li>
              <li><strong>Sleep hotspots</strong> op het canvas om ze te herpositioneren.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-base text-slate-900 mb-2">Hotspots beheren</h3>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>Plaatsen</strong>: klik op het canvas → vul Sample ID in → Toevoegen.</li>
              <li><strong>Verplaatsen</strong>: sleep een hotspot-marker naar een nieuwe positie.</li>
              <li><strong>Audio bewerken</strong>: klik het potlood-icoon in de hotspot-lijst rechts.</li>
              <li><strong>Verwijderen</strong>: klik het prullenbak-icoon in de hotspot-lijst.</li>
              <li>Groene badge = audio gekoppeld, oranje badge = nog geen audio.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base text-slate-900 mb-2">Exporteren &amp; verwerken</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Klik op <strong>"Kopieer JSON"</strong> of <strong>"Download JSON"</strong> in het Export-panel.</li>
              <li>De JSON bevat: locatie-config, i18n-vertalingen, en sample-stubs.</li>
              <li>Geef de JSON aan Claude om te verwerken in de codebase.</li>
              <li>Plaats MP3-bestanden handmatig in: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">/public/audio/themes/&#123;themeId&#125;/&#123;locationId&#125;/</code></li>
              <li>Plaats de achtergrondafbeelding in: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">/public/images/themes/&#123;themeId&#125;/</code></li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-base text-slate-900 mb-2">JSON structuur</h3>
            <ul className="list-disc list-inside space-y-1.5">
              <li><strong>location</strong>: configuratie voor het locatie-bestand (hotspots, achtergrond, etc.)</li>
              <li><strong>i18n</strong>: vertalingen voor NL en EN (namen, beschrijvingen, sample labels)</li>
              <li><strong>sampleStubs</strong>: basis-informatie per sample (vul handmatig icon en color aan)</li>
              <li><strong>_meta</strong>: tijdstempel en notities</li>
            </ul>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h3 className="font-bold text-base text-amber-800 mb-1">Tips</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              <li>Sample IDs zijn altijd lowercase met koppeltekens (bijv. "strand-golven").</li>
              <li>De editor slaat niets permanent op — exporteer altijd je JSON voordat je de pagina verlaat.</li>
              <li>Je kunt de editor openen met een locatie-parameter: <code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">/editor?location=park</code></li>
              <li>Wanneer je een MP3 uploadt bij een hotspot, wordt de duur automatisch uitgelezen en meegenomen in de export.</li>
            </ul>
          </section>
        </div>

        <div className="mt-6">
          <Button
            onClick={() => setShowHelp(false)}
            variant="secondary"
            className="w-full"
          >
            Sluiten
          </Button>
        </div>
      </Modal>

      {/* Hotspot modal — new or edit */}
      <HotspotModal
        isOpen={isModalOpen}
        locationId={locationId}
        editHotspot={editingHotspotId ? hotspots.find((h) => h.id === editingHotspotId) : undefined}
        onConfirm={handleModalConfirm}
        onUpdate={handleUpdateHotspot}
        onCancel={handleModalCancel}
      />

      {/* Reset bevestiging (UX-DEST-2) */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset"
        size="sm"
      >
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          Weet je zeker dat je alles wilt resetten?
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowResetModal(false)}
            className="flex-1"
          >
            Annuleren
          </Button>
          <Button
            variant="primary"
            onClick={handleResetConfirm}
            className="flex-1 !bg-error-600 hover:!bg-error-700 !text-white"
          >
            Reset
          </Button>
        </div>
      </Modal>
    </div>
  );
}
