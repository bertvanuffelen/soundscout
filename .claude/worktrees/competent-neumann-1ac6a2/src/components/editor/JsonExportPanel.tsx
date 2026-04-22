/**
 * JsonExportPanel - Export generated JSON for use in codebase
 */

import { useState, useCallback } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { Button } from '../ui';

interface JsonExportPanelProps {
  generateJson: () => object;
  locationId: string;
  isValid: boolean;
}

export function JsonExportPanel({
  generateJson,
  locationId,
  isValid,
}: JsonExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = useCallback(async () => {
    const json = generateJson();
    const jsonString = JSON.stringify(json, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Kopiëren mislukt. Gebruik de download knop.');
    }
  }, [generateJson]);

  const handleDownload = useCallback(() => {
    const json = generateJson();
    const jsonString = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${locationId || 'location'}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateJson, locationId]);

  if (!isValid) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        Vul een Location ID in en plaats minimaal 1 hotspot om te exporteren.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          {copied ? (
            <>
              <Check size={16} className="mr-1" />
              Gekopieerd!
            </>
          ) : (
            <>
              <Copy size={16} className="mr-1" />
              Kopieer JSON
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download size={16} className="mr-1" />
          Download
        </Button>
      </div>

      {/* Toggle preview */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="text-xs text-slate-500 hover:text-slate-400 underline"
      >
        {showPreview ? 'Verberg preview' : 'Toon JSON preview'}
      </button>

      {/* JSON Preview */}
      {showPreview && (
        <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
          {JSON.stringify(generateJson(), null, 2)}
        </pre>
      )}

      {/* Instructions */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>Na export:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
          <li>Kopieer location naar locations.ts</li>
          <li>Kopieer samples naar samples.ts</li>
          <li>Voeg i18n toe aan nl.json en en.json</li>
          <li>Vul duration, icon en color in</li>
        </ol>
      </div>
    </div>
  );
}
