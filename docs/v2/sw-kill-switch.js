/*
 * NOODREM voor de service worker van SoundScout — zie docs/v2/OFFLINE.md §6.
 *
 * Gebruik: upload dit bestand naar de ROOT van de website onder de naam
 * `sw.js` (overschrijf de bestaande). Er is geen build voor nodig.
 *
 * Wat het doet op elk apparaat, bij het eerstvolgende bezoek (of binnen een
 * uur bij een open tabblad):
 *   1. neemt direct de plaats in van de oude service worker;
 *   2. verwijdert ALLE caches van de service worker (app + thema-media);
 *   3. meldt zichzelf af;
 *   4. herlaadt de open tabbladen, die daarna gewoon van de server laden.
 *
 * Werk van leerlingen staat niet in deze caches (dat staat in localStorage /
 * IndexedDB) en blijft dus bewaard.
 *
 * Laat dit bestand staan tot de volgende gewone upload; die zet er weer een
 * echte sw.js voor in de plaats.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
  // Nog een paar keer, ook NA het installeren. In de test (Chromium 159) nam
  // de nieuwe service worker het niet over als skipWaiting() alleen tijdens
  // het installeren werd aangeroepen; een aanroep erna werkt wel. Extra
  // aanroepen zijn onschuldig.
  for (const delay of [300, 1000, 3000, 8000]) {
    setTimeout(() => self.skipWaiting(), delay);
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.navigate(client.url);
    }
  })());
});
