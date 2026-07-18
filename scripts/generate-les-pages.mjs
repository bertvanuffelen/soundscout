/**
 * generate-les-pages.mjs — statische, SEO-vriendelijke leskaart-pagina's (R4)
 *
 * Genereert per ingebouwde leskaart een pure-HTML-pagina onder
 * public/les/<key>/index.html (geen JavaScript — CSP-proof), plus één
 * gedeelde stylesheet public/les/les.css, en actualiseert de
 * /les/-vermeldingen in public/sitemap.xml (idempotent).
 *
 * Bronnen: teksten uit src/i18n/locales/nl.json (lessonCards.builtin.<key>),
 * niet-i18n-velden (cover/type/pdf) uit scripts/les-pages-data.json.
 * Draait automatisch via het "prebuild"-script; handmatig: node scripts/generate-les-pages.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const i18n = JSON.parse(readFileSync(join(root, 'src/i18n/locales/nl.json'), 'utf8'));
const config = JSON.parse(readFileSync(join(root, 'scripts/les-pages-data.json'), 'utf8'));

const builtin = i18n.lessonCards?.builtin ?? {};
const BASE = config.baseUrl;

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

// --- Gedeelde stylesheet (klein, tokens uit de app-huisstijl) ---
const css = `:root{--bg:#f8fafc;--surface:#ffffff;--text:#0f172a;--muted:#64748b;--accent:#f59e0b;--accent-dark:#b45309;--border:#e2e8f0}
*{box-sizing:border-box;margin:0}
body{font-family:'Nunito',-apple-system,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.wrap{max-width:720px;margin:0 auto;padding:24px 20px 64px}
.brand{display:flex;align-items:center;justify-content:space-between;padding:8px 0 24px}
.brand a{color:var(--text);text-decoration:none;font-weight:800;font-size:20px}
.brand .sub{color:var(--muted);font-size:14px;text-decoration:none}
.card{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.06)}
.cover{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.inner{padding:24px 28px 28px}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.badge{font-size:12px;font-weight:700;padding:3px 12px;border-radius:999px;background:#fef3c7;color:var(--accent-dark)}
.badge.alt{background:#f1f5f9;color:var(--muted)}
h1{font-size:32px;font-weight:800;letter-spacing:-.02em;margin-bottom:10px}
.goal{font-size:16px;margin-bottom:20px}
.goal b{font-weight:800}
h2{font-size:17px;font-weight:800;margin:22px 0 10px}
ol.phases{padding-left:0;list-style:none;counter-reset:fase}
ol.phases li{position:relative;padding:0 0 12px 40px;counter-increment:fase}
ol.phases li::before{content:counter(fase);position:absolute;left:0;top:1px;width:26px;height:26px;border-radius:999px;background:#fef3c7;color:var(--accent-dark);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
ol.phases b{font-weight:800}
ul.steps{padding-left:20px;color:var(--muted);font-size:15px}
.cta{display:block;text-align:center;background:var(--accent);color:#3b2b06;font-weight:800;font-size:18px;padding:16px 24px;border-radius:999px;text-decoration:none;margin:26px 0 10px;box-shadow:0 6px 16px rgba(245,158,11,.35)}
.cta:hover{background:#f5a623}
.cta-sub{text-align:center;color:var(--muted);font-size:13px}
.foot{margin-top:28px;text-align:center;font-size:14px}
.foot a{color:var(--accent-dark);font-weight:700;text-decoration:none}
footer{margin-top:40px;text-align:center;color:var(--muted);font-size:12px}`;

mkdirSync(join(root, 'public/les'), { recursive: true });
writeFileSync(join(root, 'public/les/les.css'), css);

// --- Pagina per key ---
for (const entry of config.keys) {
  const t = builtin[entry.key];
  if (!t) {
    console.error(`⚠️  Geen i18n-content voor leskaart "${entry.key}" — pagina overgeslagen.`);
    continue;
  }
  const url = `${BASE}/les/${entry.key}`;
  const title = t.title;
  const description = `Gratis muziekles voor het basisonderwijs: ${t.goal}`.slice(0, 158);
  const phases = Array.isArray(t.phases) ? t.phases : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${title} — SoundScout leskaart`,
    description: t.goal,
    educationalLevel: t.level,
    inLanguage: 'nl',
    learningResourceType: 'Lesson plan',
    isAccessibleForFree: true,
    provider: { '@type': 'Organization', name: 'SoundScout', url: BASE },
    url,
  };

  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — gratis muziekles voor het basisonderwijs | SoundScout</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)} — SoundScout leskaart">
  <meta property="og:description" content="${esc(t.goal)}">
  <meta property="og:url" content="${url}">
${entry.cover ? `  <meta property="og:image" content="${BASE}${entry.cover}">\n` : ''}  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/images/overige/logo-soundscout.svg">
  <link rel="icon" type="image/png" href="/images/overige/logo-soundscout.png">
  <link rel="stylesheet" href="/les/les.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <div class="wrap">
    <nav class="brand">
      <a href="/teacher">SoundScout</a>
      <a class="sub" href="/teacher">Voor docenten</a>
    </nav>
    <main class="card">
${entry.cover ? `      <img class="cover" src="${entry.cover}" alt="${esc(title)}">\n` : ''}      <div class="inner">
        <div class="badges">
          <span class="badge">${esc(entry.typeLabel)}</span>
          <span class="badge alt">${esc(t.level)}</span>
          <span class="badge alt">Gratis leskaart</span>
        </div>
        <h1>${esc(title)}</h1>
        <p class="goal"><b>Lesdoel:</b> ${esc(t.goal)}</p>
${phases.length > 0 ? `        <h2>Zo verloopt de les</h2>
        <ol class="phases">
${phases.map((p) => `          <li><b>${esc(p.name)}</b> — ${esc(p.text)}</li>`).join('\n')}
        </ol>\n` : ''}        <h2>Zo werkt SoundScout</h2>
        <ul class="steps">
          <li>Activeer deze leskaart voor je klas en zet de 4-cijferige klascode op het bord.</li>
          <li>Leerlingen verzamelen geluiden en componeren in hun eigen studio — op elk device, zonder account.</li>
          <li>Jij ontvangt de composities, geeft feedback en presenteert op het digibord.</li>
        </ul>
        <a class="cta" href="/?screen=teacher&amp;lesson=${entry.key}">Open voor je klas</a>
        <p class="cta-sub">Gratis docentenaccount in één minuut — geen leerlinggegevens nodig.</p>
${entry.pdf ? `        <p class="foot"><a href="${esc(entry.pdf)}">Download de leskaart als pdf</a></p>\n` : ''}        <p class="foot"><a href="/teacher">Ontdek alle leskaarten en mogelijkheden →</a></p>
      </div>
    </main>
    <footer>SoundScout — muziek maken en componeren in de klas · <a href="/teacher" style="color:inherit">soundscout.nl/teacher</a></footer>
  </div>
</body>
</html>
`;

  mkdirSync(join(root, 'public/les', entry.key), { recursive: true });
  writeFileSync(join(root, 'public/les', entry.key, 'index.html'), html);
  console.log(`✓ /les/${entry.key}`);
}

// --- Sitemap actualiseren (idempotent: bestaande /les/-entries vervangen) ---
const sitemapPath = join(root, 'public/sitemap.xml');
let sitemap = readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace(/\s*<url>\s*<loc>[^<]*\/les\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
const lesEntries = config.keys
  .filter((e) => builtin[e.key])
  .map((e) => `  <url>\n    <loc>${BASE}/les/${e.key}</loc>\n    <priority>0.8</priority>\n  </url>`)
  .join('\n');
sitemap = sitemap.replace('</urlset>', `${lesEntries}\n</urlset>`);
writeFileSync(sitemapPath, sitemap);
console.log('✓ sitemap.xml bijgewerkt');
