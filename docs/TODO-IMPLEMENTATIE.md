# SoundScout - Implementatie Todo's

**Laatst bijgewerkt**: 2026-02-01
**Gebaseerd op**: PRD Fase 4 & 5, gebruiker feedback

---

## Prioriteiten Legenda

| Prio | Betekenis |
|------|-----------|
| 🔴 P1 | Hoogste prioriteit - nu aanpakken |
| 🟠 P2 | Hoge prioriteit - snel na P1 |
| 🟡 P3 | Medium prioriteit |
| 🟢 P4 | Lage prioriteit - later |
| ⚪ P5 | Zeer lage prioriteit / parkeren |
| ❌ | Verwijderd / niet implementeren |

---

## ✅ VOLTOOID

### 1. Nieuwe Locaties & Stadskaart (5.1) ✅
**Status:** VOLTOOID

- [x] Stadskaart/hub als nieuw scherm (`'map'` screen)
- [x] Elk locatie eigen kleurenpalet en sfeer
- [x] Theme systeem met URL parameter (`?theme=basis`)
- [x] Boerderij locatie (6 samples)
- [x] Speeltuin locatie (6 samples)
- [x] Gymzaal locatie (6 samples)
- [x] Muziekwinkel locatie (6 samples)
- [x] Voortgangsindicator per locatie (verzameld/totaal badge)
- [ ] Extra locaties toevoegen - LATER (assets nodig)

### 2. Audio Export als MP3 (4.5) ✅
**Status:** VOLTOOID

- [x] "Download als MP3" knop in Club-scherm
- [x] Tone.js Offline rendering implementeren
- [x] Converteren naar MP3 (@breezystack/lamejs)
- [x] Bestandsnaam: `{compositie-naam}.mp3`
- [x] Progress indicator tijdens export
- [x] Error handling en success feedback

### 3. Lokaal Opslaan & Beheren (4.1, 4.2) ✅
**Status:** VOLTOOID

- [x] "Opslaan" knop in Club-scherm
- [x] Compositie naam invoer
- [x] Automatische metadata: datum, duur, aantal tracks
- [x] "Mijn Composities" scherm
- [x] Acties: Openen, Afspelen, Verwijderen
- [x] Re-save bestaande compositie (update i.p.v. nieuwe)
- [x] Waarschuwing over lokale opslag

### 4. Responsive Design ✅
**Status:** VOLTOOID (2026-02-01)

- [x] Touch feedback (active states) op alle buttons
- [x] Hover-afhankelijke acties altijd zichtbaar op mobile
- [x] Responsive scaling alle componenten (sm: breakpoint)
- [x] LocationMarker: 20×20px op mobile, labels verborgen
- [x] SampleLibrary: compacte weergave op mobile
- [x] RecorderBar: responsive slots
- [x] TransportControls: kleinere buttons op mobile
- [x] Minimum touch targets (44px)
- [x] 16:9 canvas containers voor LocationScene en MapView

### 5. Studio Layout ✅
**Status:** VOLTOOID

- [x] 8 tracks (was 4)
- [x] Timeline onderaan (boven transport controls)
- [x] Library met flex-wrap (geen horizontal scroll)

---

## 🔴 P1 - HOOGSTE PRIORITEIT (nu)

### 6. Locatie Editor (5.8) - Voor ontwikkelaar
**Waarom hoog?** Maakt het makkelijker om nieuwe locaties visueel te bouwen.

- [x] Upload achtergrondafbeelding
- [x] Klik om hotspots te plaatsen
- [x] Configureer hotspot grootte
- [x] Preview modus
- [x] Export als JSON (voor in codebase)
- [ ] Upload samples (MP3) direct koppelen
- [ ] Drag & drop hotspots verplaatsen

---

## 🟠 P2 - HOGE PRIORITEIT

### 7. Nieuwe Locaties Toevoegen
- [ ] Extra achtergrondafbeeldingen maken/verkrijgen
- [ ] Samples opnemen/verzamelen per locatie
- [ ] Via Locatie Editor configureren

---

## 🟡 P3 - MEDIUM PRIORITEIT

### 6. Hotspot Animaties (5.3)
**Status:** Basis animaties al geïmplementeerd (pulse, hover)
- [ ] Idle animatie (subtiele beweging)
- [ ] Hover animatie
- [ ] Active animatie (tijdens afspelen)
- [ ] Collected animatie (na verzamelen)

**Technisch:** Sprite sheets of CSS animaties.

### 7. Ambient Audio (5.2)
- [ ] Loopende ambient track per locatie
- [ ] Fade in bij betreden locatie
- [ ] Fade out bij verlaten
- [ ] **Toggle in openingsscherm**: "Achtergrondmuziek aan/uit"
- [ ] ~~Volume slider~~ ❌ VERWIJDERD - alleen aan/uit

### 8. Thema Pakketten Architectuur (5.9)
- [ ] URL parameter voor thema: `?theme=kerst`
- [ ] Thema config structuur ontwerpen
- [ ] Dropdown in openingsscherm (leeg zolang geen thema's)
- [ ] Documenteer hoe nieuwe thema's toe te voegen

**Notities:**
- Nu architectuur voorbereiden zodat later makkelijk uit te breiden
- Dropdown is leeg/hidden totdat eerste thema bestaat

### 9. Delen met Link (4.3) - Supabase vereist
- [ ] Deellink genereren (bijv. PARK-7X3K)
- [ ] Kopieer knop in modal
- [ ] Publieke luisterpagina (`/luister/:shareCode`)
- [ ] Link 30 dagen geldig
- [ ] ~~QR-code~~ (optioneel, lage prio)

### 10. Klas-code Systeem (4.4) - Supabase vereist
- [ ] Docent maakt klas-code aan
- [ ] Leerling voert code in bij delen
- [ ] Docenten dashboard met overzicht
- [ ] ~~Bulk afspelen~~ ❌ VERWIJDERD
- [ ] ~~CSV export~~ ❌ VERWIJDERD

---

## 🟢 P4 - LAGE PRIORITEIT

### 11. Overige Locaties (5.1 vervolg)
- [ ] Spookhuis locatie
- [ ] School locatie
- [ ] Strand locatie
- [ ] Markt locatie
- [ ] Ruimtestation locatie

### 12. Eigen Samples Opnemen (5.5)
**Notitie:** Mooie feature, maar pas implementeren na rest.

- [ ] Microfoon permissie
- [ ] Real-time waveform visualisatie
- [ ] Max 5 seconden opname
- [ ] Preview na opname
- [ ] Opslaan met automatisch icoon (🎤)

---

## ⚪ P5 - ZEER LAGE PRIORITEIT / PARKEREN

### 13. Sample Effecten (5.4)
**Notitie:** Niet relevant nu, ver in de toekomst.

- [ ] Per-clip volume
- [ ] Pitch shift
- [ ] Reverb
- [ ] Pan
- [ ] Filter

### 14. Multiplayer (5.7)
**Status:** 🔄 GEPARKEERD - misschien later

- [ ] Real-time samenwerken
- [ ] Room systeem
- [ ] Chat/emoji

---

## ❌ VERWIJDERD

Deze features worden NIET geïmplementeerd:

| Feature | Reden |
|---------|-------|
| Locked locaties (5.1) | Niet nodig, vrije toegang |
| Achievements & Badges (5.6) | Niet gewenst |
| Bulk afspelen (4.4) | Overkill |
| CSV export (4.4) | Overkill |
| Volume slider ambient (5.2) | Alleen aan/uit nodig |

---

## Architectuur Voorbereidingen (al gedaan)

Deze types/services zijn al voorbereid voor toekomstige implementatie:

| Item | Status | Voor feature |
|------|--------|--------------|
| `SavedComposition` type | ✅ | 4.1, 4.2 |
| `SharedComposition` type | ✅ | 4.3 |
| `StorageService` | ✅ | 4.1, 4.2 |
| `UserRole`, `UserSession` | ✅ | 4.4 |
| `useUserStore` | ✅ | 4.4 |
| `ClipEffects` type | ✅ | 5.4 (lage prio) |
| `GameScreen` met 'map' | ✅ | 5.1 |

**Te verwijderen** (niet meer nodig):
- Badge-gerelateerde types (indien aanwezig)

---

## Belangrijke UX Notities

### Melding bij Lokaal Opslaan
Bij elke opslag-actie (4.1, 4.2) tonen:
```
"Je compositie is lokaal opgeslagen in je browser.
Let op: als je browsergegevens wist, gaat je compositie verloren."
```
- Kort en duidelijk
- Niet te technisch
- Eenmalig per sessie tonen (of checkbox "niet meer tonen")

### Thema URL Parameter
Structuur: `https://soundscout.app/?theme=kerst`
- Laadt specifiek thema pakket
- Fallback naar standaard als thema niet bestaat
- Dropdown in UI is leeg totdat thema's bestaan

---

## Volgende Stappen

1. ~~Locaties & Stadskaart~~ ✅ VOLTOOID
2. ~~MP3 Export~~ ✅ VOLTOOID
3. ~~Lokaal Opslaan + Beheren~~ ✅ VOLTOOID
4. ~~Responsive Design~~ ✅ VOLTOOID
5. ~~Studio Layout (8 tracks)~~ ✅ VOLTOOID
6. **Nu**: Locatie Editor verbeteren (drag & drop hotspots)
7. **Daarna**: Nieuwe locaties toevoegen
8. **Dan**: Delen met Link (P3, vereist Supabase)
