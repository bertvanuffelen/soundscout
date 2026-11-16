# Lokale opslag na V2 Fase 2

Lokaal bewaarde composities ("Mijn soundscapes") staan niet meer in
`localStorage` maar in IndexedDB (via Dexie). Al het andere blijft waar het was.
Code: `src/services/compositionStore.ts` (ontwerpnotitie bovenaan) en
`src/services/StorageService.ts`.

## Wat staat waar

| Gegevens | Plek | Sleutel / naam |
|---|---|---|
| Lokaal bewaarde composities | **IndexedDB** | database `soundscout-local`, tabel `compositions` (sleutel `id`, index `updatedAt`) |
| "Migratie klaar"-vlag (leidend) | IndexedDB | tabel `meta`, rij `legacy-migration` |
| Back-up van de oude lijst (bevroren) | localStorage | `soundscout:compositions` |
| Migratie-marker (datum + aantallen) | localStorage | `soundscout:migrated-to-idb` |
| Logboek van nog niet bevestigde schrijfacties | localStorage | `soundscout:compositions-outbox` (normaal leeg/afwezig) |
| Werk in uitvoering | localStorage | `soundscout:wip` (ongewijzigd) |
| Bibliotheek, voorkeuren, bewaarcode-info, feedbackcode, inzendgeheimen, first-run-vlaggen, sequencer-lab | localStorage | ongewijzigd |

Alleen de composities zijn verhuisd. Er is geen andere grote lading gevonden die
erbij hoort: `soundscout:wip` is één compositie groot en moet synchroon bij het
opstarten gelezen worden, dus die blijft bewust in localStorage.

Bereik: dezelfde origin als voorheen. Er is niets toegevoegd dat gegevens tussen
gebruikers, apparaten of origins deelt.

## Synchrone API, asynchrone database

`storageService` is synchroon gebleven. De store houdt een cache in het geheugen
(gevuld bij het opstarten) en schrijft door naar IndexedDB.

- **Lezen** komt uit de cache. In de eerste milliseconden (IndexedDB opent nog)
  komt het uit localStorage; zodra de opslag klaar is krijgen `StartScreen` en
  `CompositionsView` een seintje via `useCompositionsVersion()`.
- **Schrijven** gaat eerst synchroon naar het logboek in localStorage en daarna
  naar IndexedDB. Na bevestiging wordt de regel uit het logboek gehaald. Sluit
  het tabblad te vroeg, dan wordt het logboek bij de volgende start verwerkt
  (nieuwste `updatedAt` wint, dus herhalen is onschadelijk).
- Er is geen aanroep in `main.tsx`/`App.tsx` nodig: de store opent zichzelf bij
  het laden van `StorageService`.

## Migratie (eenmalig)

1. Lees `soundscout:compositions`. Elk item gaat door `SavedCompositionSchema`.
   Ongeldige items worden overgeslagen en geteld.
2. Schrijf de marker met `state: "copying"`. Lukt dat niet, dan wordt er niet
   gemigreerd en werkt de app deze sessie op localStorage.
3. **Eén IndexedDB-transactie**: kopieer de geldige items (bestaat het id al,
   dan wint de nieuwste), lees ze terug, controleer aantal en schema, en zet de
   vlag in `meta`. Faalt er iets, dan draait de hele transactie terug.
4. Werk de marker bij naar `state: "done"` met `migratedAt`, `sourceCount`,
   `migratedCount`, `skippedCount`.

De oude lijst wordt niet gewist en niet overschreven. Twee uitzonderingen, beide
bewust:

- Verwijdert een gebruiker zelf een compositie (prullenbak, of "Klaar, ik stop"
  op een gedeeld apparaat), dan wordt die ene compositie ook uit de back-up
  gehaald. Anders zou werk van een kind op een schoolcomputer blijven staan
  nadat het gewist leek. De overige items, ook kapotte, blijven staan.
- Draait een browser na de migratie een keer zonder IndexedDB, dan blijft de
  back-up toch bevroren; nieuw werk gaat naar het logboek.

Herhalen en afbreken:

- Vlag in `meta` aanwezig → niets doen (verwijderde composities komen dus niet
  terug uit de back-up).
- Marker `copying` zonder vlag (crash halverwege) → migratie opnieuw; er stond
  nog niets in IndexedDB, dus geen dubbelen.
- Marker `done` maar IndexedDB leeg (browser heeft de database gewist) → de
  back-up wordt opnieuw ingelezen, met een waarschuwing in het log.

Overgeslagen items worden gemeld via `logger.warn`, in `skippedCount` van de
marker, en in die sessie via `lastLoadDroppedCount` (de bestaande melding in
"Mijn soundscapes").

## Terugval

De app valt terug op localStorage als IndexedDB ontbreekt, het openen weigert of
langer dan 4 seconden duurt, of de migratie-transactie mislukt. Dat wordt gelogd
met `logger.warn`; de gebruiker merkt er niets van.

| Situatie | Lezen | Schrijven |
|---|---|---|
| Nooit gemigreerd (geen marker) | `soundscout:compositions` | `soundscout:compositions`, precies als vroeger, inclusief de directe quota-fout |
| Wel gemigreerd, IndexedDB doet het nu niet | back-up + logboek | logboek; wordt verwerkt zodra IndexedDB weer werkt |

In het tweede geval ziet de gebruiker de stand van het moment van migreren plus
wat sindsdien in het logboek kwam, niet wat alleen in IndexedDB stond.

Opslag vol:

- Terugval: `saveComposition` geeft `null` en `lastSaveError` is
  `quota_exceeded`, zoals voorheen.
- IndexedDB-stand, localStorage vol: het bewaren gaat door (alleen IndexedDB).
- IndexedDB vol, logboek gelukt: geen fout; het werk staat in localStorage en
  wordt later verwerkt.
- Beide vol: de aanroeper had al "gelukt" terug. `lastSaveError` wordt achteraf
  gezet, er gaat een `logger.error` uit, het werk blijft in het geheugen en
  wordt bij elke volgende schrijfactie opnieuw geprobeerd. De UI toont dit nu
  niet; wie zekerheid wil kan `storageService.whenCompositionsPersisted()`
  afwachten en daarna `lastSaveError` lezen.

## Het maximum van 10

`MAX_LOCAL_COMPOSITIONS` in `StorageService.ts` is de enige plek. Het gedrag is
ongewijzigd: bij de elfde verdwijnt de oudste (die blijft wel in de back-up als
hij daar al stond). Verhogen of schrappen vraagt:

- de constante aanpassen (of de opruiming in `saveComposition` weghalen);
- geen i18n-teksten: de app noemt het getal nergens;
- documentatie: `docs/BEWAREN-VAN-COMPOSITIES.md` (2 plekken),
  `docs/HANDLEIDING-BEHEER.md` §localStorage, `docs/USECASES-QA.md` L16,
  `CLAUDE.md` (Services-tabel), en TODO `AUD-08` (waarschuwing bij 10/10)
  vervalt of verandert;
- productvraag: op gedeelde apparaten groeit "Mijn soundscapes" dan door met
  werk van andere kinderen; de lijst in `CompositionsView` heeft geen paginering.

## Met de hand bekijken en herstellen (DevTools)

1. Open DevTools → **Application** (Chrome/Edge) of **Storage** (Firefox/Safari).
2. **IndexedDB → soundscout-local → compositions**: één rij per compositie.
   `meta` bevat de migratievlag.
3. **Local Storage → de site**: `soundscout:compositions` is de back-up,
   `soundscout:migrated-to-idb` de marker.

Back-up veiligstellen (Console):

```js
copy(localStorage.getItem('soundscout:compositions'))
```

Alles uit IndexedDB exporteren:

```js
const r = indexedDB.open('soundscout-local');
r.onsuccess = () => r.result.transaction('compositions').objectStore('compositions')
  .getAll().onsuccess = (e) => console.log(JSON.stringify(e.target.result));
```

Opnieuw laten migreren vanuit de back-up (bijvoorbeeld na een kapotte database):
verwijder de database `soundscout-local` in DevTools en herlaad. De marker mag
blijven staan.

Een overgeslagen (kapot) item herstellen: haal het uit de back-up, repareer de
JSON, zet het terug in `soundscout:compositions`, verwijder de database en
herlaad.

## Terugdraaien

- **Code**: zet `StorageService.ts`, `StartScreen.tsx` en `CompositionsView.tsx`
  terug en verwijder `compositionStore.ts`, `useCompositionsVersion.ts`, de twee
  testbestanden, `e2e/local-storage.spec.ts` en de pakketten `dexie` en
  `fake-indexeddb`.
- **Gegevens**: een oudere versie leest `soundscout:compositions`, dus de stand
  van vóór de migratie. Wat daarna is bewaard staat alleen in IndexedDB en is
  voor de oude versie onzichtbaar (niet weg: het komt terug zodra de nieuwe
  versie weer draait). Wil je dat meenemen, exporteer dan eerst uit IndexedDB
  (zie boven) en schrijf het terug naar `soundscout:compositions`.
- De sleutels `soundscout:migrated-to-idb` en `soundscout:compositions-outbox`
  negeert de oude versie.

## Later opruimen

De back-up blijft localStorage-ruimte innemen (gedeeld met `soundscout:wip` en
de bibliotheek). Een latere release kan hem na een veilige periode verwijderen;
dat is nu bewust niet gedaan.
