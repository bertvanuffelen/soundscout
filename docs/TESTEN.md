# SoundScout — Handmatig Testen

Checklist voor hands-on testen op diverse apparaten.
Vink af wat getest en goed bevonden is. Noteer bevindingen direct onder het item.

**Laatst bijgewerkt**: 2026-03-13

---

## Benodigde apparaten

- iPad (Safari)
- Android tablet (Chrome)
- Chromebook (Chrome, eventueel met beheerder-policies)
- Desktop/laptop (Chrome, Firefox, Safari)
- Smartphone (optioneel, voor mobiele weergave)

---

## 1. Template met Storyboard (#41 D.4)

Flow: docent maakt compositie met storyboard → slaat op als template → leerling voert code in.

### Als docent

- [x] Open SoundScout met `?storytelling=true`
- [x] Kies een storyboard in het compose-mode scherm
- [x] Maak een compositie met clips op de timeline
- [x] Controleer dat de afbeeldingen meebewegen met de secties
- [x] Ga naar het podium (Stage)
- [x] Klik "Opslaan als opdracht"
- [x] Controleer dat de indicator "Storyboard wordt meegenomen" zichtbaar is in de modal
- [x] Sla op en kopieer de templatecode

### Als leerling

- [x] Open SoundScout (nieuw venster/incognito)
- [x] Voer de templatecode in op het startscherm
- [x] Controleer dat de studio opent met de template-clips
- [x] Controleer dat het storyboard automatisch actief is (afbeeldingen zichtbaar)
- [x] Controleer dat de storyboard-afbeeldingen synchroon lopen met de secties
- [x] Voeg eigen clips toe en controleer dat template-clips vergrendeld zijn (als dat was ingesteld)
- [x] Speel de compositie af op het podium — afbeeldingen moeten wisselen bij sectieovergangen

### Template zonder storyboard

- [x] Maak een template zonder actief storyboard
- [x] Controleer dat de "Storyboard wordt meegenomen" indicator NIET verschijnt in de modal
- [x] Leerling laadt template — controleer dat er geen storyboard geactiveerd wordt

---

## 2. Touch & Drag op Tablets en Chromebooks (#16)

Verbeteringen doorgevoerd: touch tolerance verhoogd (10px), touch-action:none op tracks, autoplay unlock.

### Audio autoplay

- [ ] **iPad Safari**: Open SoundScout, tik ergens op het scherm, probeer daarna audio af te spelen — moet direct werken
- [ ] **Android Chrome**: Idem
- [ ] **Chromebook Chrome**: Idem — let op of beheerder-policies de autoplay blokkeren
- [ ] **Chromebook met restricties**: Test of de eerste user gesture (klik/tik) voldoende is om audio te unlocken

### Drag-and-drop clips

- [ ] **iPad**: Sleep een sample uit de bibliotheek naar de timeline — clip moet soepel meebewegen
- [ ] **iPad**: Verplaats een bestaande clip op de timeline — geen springen of onverwachte posities
- [ ] **Android tablet**: Idem — sample naar timeline slepen
- [ ] **Android tablet**: Idem — clip verplaatsen
- [ ] **Chromebook**: Idem — beide acties testen met touchscreen
- [ ] Controleer dat verticaal scrollen van de pagina NIET triggert tijdens een drag actie op de timeline
- [ ] Controleer dat er geen "dubbele touch events" optreden (clip springt naar verkeerde plek)

### Touch targets

- [ ] Zijn clips groot genoeg om te tikken bij standaard zoomniveau? (minimum 44px)
- [ ] Zijn clips nog bruikbaar bij 0.5× zoom? Moet je dan inzoomen?
- [ ] Kunnen de zoom-knoppen (+, −, fit) makkelijk geraakt worden op touch?
- [ ] Zijn de timeline header-knoppen (undo, redo, zoom, eraser, flag) comfortabel te tikken?
- [ ] Is de play/pause knop makkelijk te raken op een klein scherm?

### Edge cases touch

- [ ] Snelle opeenvolgende taps op een clip — crasht of dubbelt iets?
- [ ] Twee vingers tegelijk op de timeline — wat gebeurt er? (geen pinch-to-zoom verwacht)
- [ ] Clip slepen en halverwege loslaten — keert clip terug naar originele positie?
- [ ] Lange druk (long press) op een clip — wordt het correct als drag geïnterpreteerd?

---

## 3. Timeline Zoom (#53)

### Desktop

- [x] Bij openen van de studio: hele timeline past in beeld (fit-to-width)
- [x] Klik op + (zoom in): timeline wordt breder, scroll positie centreert op playhead
- [x] Klik op − (zoom out): timeline wordt smaller
- [x] Klik op "fit" knop: timeline keert terug naar volledige breedte
- [x] Zoom in terwijl playhead aan het begin staat — playhead moet in beeld blijven
- [x] Zoom in terwijl playhead halverwege staat — playhead moet gecentreerd blijven
- [x] Zoom tot maximum (4×) — knoppen moeten correct uitschakelen
- [ ] Zoom in tot max en sleep een sample → clip moet op de juiste positie terechtkomen → **Bekende bug, zie #55**

### Mobiel / Tablet

- [ ] Bij openen: timeline start ingezoomd (2×) zodat clips werkbaar groot zijn
- [ ] Zoom knoppen werken correct op touch
- [ ] Na zoomen is horizontaal scrollen soepel

---

## 4. Storytelling Edge Cases (#41 D.7)

- [x] Thema zonder storyboards (bijv. `?theme=winterspelen`): compose-mode scherm moet overgeslagen worden, direct naar kaart
- [ ] Storyboard met slechts 1 afbeelding: geen pijltjes zichtbaar, afbeelding altijd zichtbaar, geen secties aangemaakt _(vereist storyboard met 1 afbeelding)_
- [x] Venster resizen tijdens actieve studio split-view: layout moet correct aanpassen
- [ ] Mobiel: tabs (afbeelding / timeline) moeten correct werken in plaats van split-view
- [ ] Storyboard wisselen naar vrij modus en terug — clips blijven staan, alleen secties/afbeeldingen resetten
- [ ] Afbeeldingwissel tijdens afspelen: bij sectie-overgang wisselt de afbeelding (momenteel hard-cut, fade is feature request → zie #62)
- [x] Playhead handmatig naar ander punt slepen: afbeelding moet direct mee-updaten naar de juiste sectie

---

## 5. Storyboard in Docentenviewer & Deellink (#49)

### Docent Dashboard (SubmissionPlayer)

- [x] Leerling stuurt een compositie met storyboard in via klascode
- [x] Docent opent het dashboard en klikt op de inzending
- [x] Controleer dat er "Met storyboard" indicator zichtbaar is in de header
- [ ] Overweeg: "Met storyboard" indicator ook tonen in het overzicht van alle inzendingen bij een klas
- [x] Controleer dat de storyboard-afbeelding boven de timeline verschijnt
- [x] Speel de compositie af — afbeelding moet wisselen bij sectie-overgangen
- [ ] Controleer dat de positie-indicator (bijv. "Afbeelding 1/3, 2/3") correct meeloopt met playback?
- [x] Inzending ZONDER storyboard openen — geen afbeelding, geen indicator, normale weergave

### Publieke Deellink (SharedPlayer)

- [x] Leerling deelt een compositie met storyboard via "Delen met link" 
- [x] Open de deellink in een nieuw venster / incognito
- [x] Controleer dat "Met storyboard" indicator zichtbaar is bij de metadata
- [x] Controleer dat de storyboard-afbeelding boven de timeline verschijnt
- [x] Speel af — afbeelding wisselt synchroon met secties
- [x] Deellink van compositie ZONDER storyboard — normale weergave, geen afbeelding

### Responsiveness

- [ ] Docent dashboard op smal scherm (tablet): storyboard viewer past in compact modus
- [ ] Deellink op smartphone: afbeelding + timeline + transport controls passen allemaal

---

## 6. Video Export (#50)

Storyboard-composities exporteren als video met crossfade-transities.

### Engine detectie

- [x] **Chrome/Edge (desktop)**: Video-exportknop verschijnt naast MP3-knop op het podium
- [x] **Chrome/Edge**: Export levert een `.mp4` bestand op (WebCodecs + Mediabunny engine)
- [ ] **Firefox**: Export levert een `.webm` bestand op (MediaRecorder fallback)
- [ ] **iPad Safari 26+**: Export levert een `.mp4` op (WebCodecs)
- [ ] **iPad Safari <26**: Export levert een `.webm` op (MediaRecorder)
- [ ] **Oudere browser zonder WebCodecs en MediaRecorder**: Video-knop is NIET zichtbaar

### Storyboard video export

- [x] Maak een compositie met storyboard (meerdere afbeeldingen) en clips op de timeline
- [x] Klik op "Download Video" op het podium
- [x] Controleer dat de progress-indicator soepel loopt van 0% naar 100%
- [x] Controleer dat het bestand wordt gedownload met de compositienaam
- [x] Speel de video af: afbeeldingen moeten wisselen synchroon met de audio
- [x] Controleer dat er een 0.5s crossfade-transitie zichtbaar is tussen afbeeldingen
- [x] Controleer dat de audio correct synchroon loopt met de video

### Enkele afbeelding (image modus)

- [ ] Maak een compositie met één afbeelding
- [ ] Exporteer als video — video toont enkele afbeelding, geen crossfade
- [ ] Audio loopt correct

### Edge cases

- [ ] Vrije compositie (geen storyboard): video-exportknop is NIET zichtbaar
- [ ] Lege timeline (geen clips): foutmelding verschijnt
- [ ] Video export tijdens MP3 export: beide knoppen disabled
- [ ] Annuleer niet — wacht tot export klaar is (geen cancel-functie in v1)

### Bestandsgroottes (indicatief)

- 30s compositie: ~15 MB (MP4) / ~18 MB (WebM)
- 60s compositie: ~30 MB (MP4) / ~36 MB (WebM)

---

## 7. Klascode & Docent Dashboard (#10, #8, #21, #36)

### Klascode flow

- [x] Docent maakt een klas aan in het dashboard — 4-cijferige code wordt gegenereerd
- [x] Leerling voert klascode in op het startscherm — wordt gekoppeld aan de klas
- [x] Leerling stuurt compositie in via "Deel met docent" — verschijnt in het dashboard
- [x] Docent ziet inzending met naam, datum, en afspeelknop
- [x] Docent kan de compositie afspelen in read-only timeline (geen drag, geen edit knoppen)
- [x] Playhead seeking werkt in docent viewer (klikken op de ruler om te zoeken)
- [x] Max 8 klassen per docent — foutmelding bij poging tot 9e klas

### Template systeem (#21)

- [x] Docent maakt een compositie en slaat op als template via het podium
- [x] Template verschijnt in het dashboard met een code
- [x] Leerling voert templatecode in — studio opent met pre-filled clips
- [x] Template-clips zijn vergrendeld (niet verplaatsbaar/verwijderbaar) als dat is ingesteld
- [x] Leerling kan eigen clips toevoegen naast de template-clips
- [ ] Sectiemarkeringen zijn vergrendeld bij actieve template (niet verplaatsbaar/resizable) → **Bekende bug, zie #56**

---

## 8. Audio & Playback (#2, #17, #18, #20, #39)

### Transport controls

- [x] Play start de compositie, Pause pauzeert exact op huidige beat
- [x] Rewind (⏪) brengt playhead terug naar beat 0
- [x] Loop aan: compositie herhaalt automatisch na het einde
- [x] Loop uit: compositie stopt na het einde
- [ ] Playhead klikken op de ruler: audio springt naar de aangeklikte positie → **Bekende bug, zie #57**
- [ ] Playhead slepen tijdens afspelen: audio hervat correct op de nieuwe positie (= seek terwijl muziek speelt)

### Volume & mute (#39)

- [x] Volume slider per track: verschijnt als popover bij klik op volume-icoon
- [x] Track muten: alle clips op die track zijn stil, visueel gedempt
- [x] Clip volume aanpassen via inline edit toolbar (selecteer clip → volume slider)
- [ ] Gecombineerd: track op -6dB + clip op -3dB = totaal -9dB hoorbaar

### Ambient audio (#18)
**Opmerking**: er is momenteel geen ambient geluid ingesteld (niets hoorbaar). Test pas relevant als audio-assets zijn toegevoegd.
- [ ] Op een locatie: ambient geluid speelt automatisch (zachter, -15dB)
- [ ] Terug naar kaart: ambient stopt met fade-out
- [ ] In de studio: geen ambient audio

### MP3 export (#2)

- [x] Klik "Download MP3" op het podium — export start met progress indicator
- [x] MP3 wordt gedownload met de compositienaam als bestandsnaam
- [x] Speel het MP3-bestand af in een externe speler — klinkt correct, geen stilte aan begin/eind
- [x] Lege timeline: podium opent niet bij lege timeline, dus MP3 export is al niet te kiezen (correct gedrag)

---

## 9. Clip Editing (#12, #23, #45, #40, #47)

### Trimmen (#12)

- [x] Sleep de linker-rand van een clip naar rechts — clip wordt korter aan de voorkant
- [x] Sleep de rechter-rand van een clip naar links — clip wordt korter aan het einde
- [x] Waveform in de clip past mee aan de trim
- [x] Getrimde clip afspelen — alleen het getrimde gedeelte klinkt
- [x] Trim ongedaan maken met Undo

### Dupliceren (#23)

- [x] Selecteer een clip → klik "Dupliceer" in de inline toolbar
- [x] Kopie verschijnt direct na het origineel (smart snap plaatsing)
- [x] Getrimde clip dupliceren: kopie behoudt dezelfde trim-instellingen
- [x] Dupliceer als er geen ruimte is op dezelfde track — wordt op de volgende track geplaatst

### Timeline wissen (#45)

- [x] Klik op de gum-icoon (eraser) in de timeline header
- [x] Inline bevestiging verschijnt ("Weet je zeker?")
- [x] Bevestig: alle clips verdwijnen, undo is beschikbaar
- [x] Annuleer: niets verandert

### Sectiemarkeringen (#40, #47)

- [x] Klik op de vlag-icoon (flag) in de timeline header — sectie-markering verschijnt
- [x] SectionBar toont kleuren en labels boven de timeline
- [x] Drag-resize: sleep een sectie-grens om de sectie groter/kleiner te maken
- [x] Minimale sectiegrootte = 2 beats (kleiner is niet mogelijk)
- [x] Secties snappen op 0.5 beat stappen
- [x] In storyboard-modus: secties bestaan al (1 per afbeelding), resizen werkt
- [x] In vrije modus: secties handmatig toevoegen/verwijderen

---

## 10. Navigatie, Kaart & Locaties (#1, #6, #11, #13)

### Startscherm & thema selectie

- [ ] App opent op startscherm met logo en "Start" knop
- [ ] Thema-selectie modal toont beschikbare thema's als kaartjes
- [ ] Selecteer een thema → kaart opent met locaties voor dat thema
- [ ] URL parameter `?theme=basis` werkt (en andere thema's)

### Kaart navigatie

- [ ] Kaart toont locaties als interactieve punten
- [ ] Voortgangsindicator toont hoeveel samples verzameld zijn
- [ ] Klik op een locatie → locatie-scherm opent met hotspots

### Locatie & hotspots (#11)

- [ ] Hotspots pulseren (animatie) om aandacht te trekken
- [ ] Hover op een hotspot → visueel feedback (hover state)
- [ ] Klik op een hotspot → sample preview speelt + wordt verzameld
- [ ] Verzamelde hotspot → collected state (check/vinkje)
- [ ] Alle hotspots verzameld → terug naar kaart, locatie toont als "compleet"

---

## 11. Delen met Link (#14)

- [ ] Op het podium: klik "Delen met link" (naam is verplicht)
- [ ] Share-code (8 karakters) wordt gegenereerd en getoond
- [ ] Kopieer de link → open in nieuw venster/incognito
- [ ] SharedPlayer laadt correct met compositienaam, tracks, secties
- [ ] Afspelen werkt in de shared player (read-only, geen edit)
- [ ] Link is 30 dagen geldig — na verloopdatum: foutmelding
- [ ] Compositie zonder secties: shared player toont geen SectionBar

---

## 12. i18n & Taal (#35)

- [ ] Taalwisselaar zichtbaar (NL/EN toggle)
- [ ] Wissel naar Engels: alle UI-teksten in het Engels
- [ ] Wissel terug naar Nederlands: alles weer in het Nederlands
- [ ] Taalvoorkeur wordt onthouden na pagina-refresh (localStorage)
- [ ] Controleer een paar schermen op hardcoded Nederlandse tekst (mag er niet zijn)
- [ ] Sample namen worden correct vertaald (bijv. "Park-vogels" → "Park-birds")

---

## 13. Responsiveness & Layout (#4, #5, #37)

### Desktop (>640px)

- [ ] Studio: library links, timeline rechts, 8 tracks zichtbaar
- [ ] Podium: alle knoppen onder elkaar, voldoende ruimte
- [ ] Dashboard: tabel met inzendingen past in het scherm

### Mobiel / Tablet (<640px)

- [ ] Studio: library en timeline in tabs (niet naast elkaar)
- [ ] Knoppen zijn minimaal 44px touch targets
- [ ] Geen horizontale scroll op het startscherm of kaartscherm
- [ ] Podium: knoppen stacked, geen overflow
- [ ] Geen grijs leeg gedeelte onderaan (`h-dvh overflow-hidden`)

---

## 14. Overige Features

### Feedback systeem (#15, #51)

- [ ] "Hulp nodig of bug melden?" link zichtbaar op het startscherm
- [ ] Klik opent feedback formulier
- [ ] Formulier verstuurt succesvol (controleer of EmailJS werkt)
- [ ] Rate limiting: na 3 berichten in korte tijd wordt je geblokkeerd

### Beat ruler (#31)

- [ ] Maatnummers 1–32 zichtbaar boven de timeline
- [ ] Nummers scrollen mee met de timeline bij horizontaal scrollen
- [ ] Nummers schalen correct mee bij in-/uitzoomen

### Tutorial video's (#54)

- [ ] "Hoe werkt het?" modal bevat link naar uitlegvideo SoundScout
- [ ] "Hoe werkt het?" modal bevat link naar uitlegvideo docent dashboard
- [ ] Links openen in een nieuw tabblad

### Locatie Editor (#27) — alleen met `?editor=true`

- [ ] Editor opent voor docenten
- [ ] MP3 uploaden per hotspot werkt (auto-duration detectie)
- [ ] Hotspot herpositioneren via drag-and-drop
- [ ] Audio preview bij klik op een hotspot
- [ ] Bestaande hotspot bewerken (naam, audio, positie)

### Undo/Redo

- [ ] Voeg een clip toe → Undo → clip verdwijnt → Redo → clip komt terug
- [ ] Trim een clip → Undo → trim wordt teruggedraaid
- [ ] Timeline wissen → Undo → alle clips komen terug
- [ ] Na opslaan en herladen: undo-stack is leeg (verwacht gedrag)

---

## 15. Basis Functionaliteit (regressie)

Bij elke testronde even controleren dat de kern werkt:

- [ ] Navigatie: Start → Kaart → Locatie → Studio → Podium (volledige flow)
- [ ] Samples verzamelen op een locatie
- [ ] Clips op timeline plaatsen via drag-and-drop
- [ ] Afspelen, pauzeren, terugspoelen
- [ ] Loopen aan/uit zetten
- [ ] Clip trimmen (sleep de randen)
- [ ] Clip dupliceren
- [ ] Clip verwijderen
- [ ] Volume per track aanpassen
- [ ] Undo/Redo
- [ ] Compositie opslaan (lokaal)
- [ ] Compositie exporteren als MP3
- [ ] Compositie delen met link
- [ ] Taal wisselen (NL ↔ EN)
- [ ] App werkt na pagina-refresh (state hersteld uit localStorage)

---

## Bevindingen

> Noteer hier bugs of opmerkingen met datum en device.

| Datum | Device | Bevinding | Issue |
|-------|--------|-----------|-------|
| | | | |
