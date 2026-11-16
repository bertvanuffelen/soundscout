/**
 * Nep-Supabase voor de service-worker-suite (e2e/sw/offline.sw.ts).
 *
 * Draait op een ANDERE origin dan de app (net als de echte Supabase), zodat de
 * suite kan bewijzen dat de service worker er van afblijft: niets wordt
 * bewaard, en zonder verbinding mislukt het verzoek gewoon.
 *
 *   node e2e/sw/fakeBackend.mjs <poort>
 *
 * - /__hits                → { hits } : hoeveel verzoeken er echt aankwamen
 * - .../rpc/get_active_assignment → één vaste klas met een vrije opdracht
 * - .../storage/v1/object/public/themes/… → een PNG (thema-bucket, migratie 043)
 * - al het andere          → []
 */
import { createServer } from 'node:http';
import { makePng } from '../fixtures/make-theme-pack.mjs';

const PNG = makePng(1920, 1080);

const port = Number(process.argv[2] ?? 5182);
let hits = 0;

const ASSIGNMENT = [{
  assignment_type: 'free',
  payload: { free_theme_id: 'basis' },
  card: null,
  class_id: '00000000-0000-0000-0000-000000000001',
  class_name: 'Groep 6a',
}];

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  // Bewust WEL cachebaar verklaard: een service worker die dit zou bewaren, valt door de mand
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/__hits') { res.end(JSON.stringify({ hits })); return; }
  hits += 1;
  if (req.url?.includes('/storage/v1/object/public/themes/')) {
    res.setHeader('Content-Type', 'image/png');
    res.end(PNG);
    return;
  }
  req.resume();
  req.on('end', () => {
    res.end(JSON.stringify(req.url?.includes('/rpc/get_active_assignment') ? ASSIGNMENT : []));
  });
}).listen(port, '127.0.0.1', () => console.log(`fake backend on ${port}`));
