# Woordenlijst & Vocabulaire Suggesties – SoundScout

**Doel:** Identificeer en evalueer gebruikersvriendelijke termen voor kinderen (6-12 jaar), met focus op verheldering van abstracte of technische jargon.

**Datum:** 27 februari 2026
**Status:** Ter review door product owner
**Taal:** Nederlands

---

## Inleiding

Deze woordenlijst inventariseert alle user-facing labels en termen uit `src/i18n/locales/nl.json` en evalueert hun geschiktheid voor kinderen. Het document focust op:
- **Navigatielabels** (buttons, menu's)
- **Sectiehoofdingen** en instructies
- **Technische termen** die vereenvoudigd kunnen worden
- **Abstracte muziekconcepten** die concretere taal nodig hebben

---

## Termen per Categorie

### 1. CORE GAME FLOW

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Compositie | `stage.title`, `start.newComposition` | "Mijn Muziekstuk" of "Mijn Nummer" | ❌ Nee | Te abstract. "Compositie" is een volwassen muziekterm. Kinderen begrijpen "lied" of "muziekstuk" beter. |
| Thema | `map.title` → "Kies een locatie" | Geen aanpassing nodig | ✅ OK | In de UI staat "Kies je wereld" (themeSelection.title), wat kindvriendelijk is. "Thema" zelf wordt niet direct zichtbaar. |
| Locatie | `location.*` | OK | ✅ OK | Duidelijk en concreet: "Boerderij", "Speeltuin" etc. Werkt goed. |
| Studio | `studio.title` | OK | ✅ OK | Kindvriendelijk genoeg. Niet verwarrend. |
| Podium | `stage.title` ("Het Podium") | OK | ✅ OK | Beter dan "Stage" of "Club". Visueel herkenbaar concept. |

---

### 2. SAMPLES & GELUID VERZAMELING

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Samples | `common.samples` | "Geluiden" | ⚠️ Deels | "Samples" is technisch jargon. Gebruikt in i18n als fallback, maar in UI staat meestal "geluiden" (samples.boerderij-lach enz). Overal "Geluiden" gebruiken voor duidelijkheid. |
| Recorder | `recorder.title` | "Geluiden Recorder" of "Mijn Opnameapparaat" | ⚠️ Deels | "Recorder" is acceptabel, maar "opnameapparaat" of gewoon "recorder" voelt meer concreet. UI geeft goed weer wat het is. |
| Eject | `recorder.eject` | "Verwijder" of "Haal eruit" | ⚠️ Deels | "Eject" is technisch en niet kindvriendelijk. Zou "Verwijder" moeten zijn (is al zo). Prima. |
| Bibliotheek | `studio.library` | "Mijn Geluiden" of "Geluidenbox" | ❌ Nee | Kinderen associëren "Bibliotheek" met een plek met BOEKEN. Gebruik "Mijn Geluiden" voor duidelijkheid. |
| Preview | `recorder.preview` | "Luister" | ✅ OK | Juist gekozen: kinderen begrijpen "Luister". |
| Empty | `recorder.empty` | "Leeg" | ✅ OK | Duidelijk. |

---

### 3. TIMELINE & COMPOSITIE-EDITOR

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Tijdlijn | `studio.timeline` | OK (alternatief: "Speelbalk" of "Geluiden-schikking") | ⚠️ Deels | "Tijdlijn" is redelijk, maar "Speelbalk" of "Geluiden-rijtje" is intuïtiever. Huidiging label is acceptabel maar niet optimal. |
| Timeline | `trimModal.title`, andere | zie bovenstaand | Zie bovenstaand | Gebruikt in: "Sleep geluiden naar de tijdlijn". Prima. |
| Clips | `common.clips` | "Geluiden" of "Nummers" | ⚠️ Deels | "Clips" is technisch. In context werkt het (visueel zie je wat het is), maar "Geluid" is eenvoudiger. |
| Tracks | `common.tracks` | "Sporen" of "Rijen" | ⚠️ Deels | "Tracks" / "Sporen" is abstracte; visuel zijn het horizontale rijen. "Rijen" is kindvriendelijker. |
| Trim | `studio.trim` | "Inkorten" | ✅ OK | Juist: Nederlands, duidelijk. |
| Sample inkorten | `trimModal.title` | OK | ✅ OK | Prima geformuleerd. |
| Duplicate | `studio.duplicate` | "Kopie maken" of "Kopiëren" | ⚠️ Deels | "Dupliceren" is technisch. "Kopie maken" is kindvriendelijker. |
| Drag hint | `studio.dragHint` | "Sleep geluiden naar de tijdlijn" | ✅ OK | Goed. Duidelijke instructie. |

---

### 4. PLAYBACK & TRANSPORT CONTROLS

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Play | `common.play` / `transport.play` | "Afspelen" | ✅ OK | Uitstekend. |
| Pause | `common.pause` / `transport.pause` | "Pauzeren" | ✅ OK | Goed. |
| Stop | `common.stop` / `transport.stop` | "Stoppen" | ✅ OK | Duidelijk. |
| Rewind | `transport.rewind` | "Terug" | ✅ OK | Prima. "Terug naar begin" zou ook kunnen, maar "Terug" is kort en duidelijk. |
| Loop | `transport.loop` | "Herhalen" | ✅ OK | Goed gekozen. Kinderen begrijpen "herhalen". |
| Transport | (geen direct i18n label) | zie onderstaand | — | "Transport controls" verschijnt niet in UI voor kinderen. Intern term. Prima. |
| Playhead | (geen direct i18n label) | — | — | Intern term, niet in i18n. Prima. |

---

### 5. ACTIES & KNOPPEN

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Afspelen | Various | OK | ✅ OK | Consistent gebruikt. Goed. |
| Terug | `map.back` etc | OK | ✅ OK | Duidelijk. |
| Delete / Verwijderen | `common.delete` | OK | ✅ OK | Duidelijk. |
| Cancel / Annuleren | `common.cancel` | OK | ✅ OK | Prima. |
| Back to Map | `location.backToMap` | "Terug naar Kaart" | ✅ OK | "Kaart" is concreteer dan "Map". Goed. |
| Go to Studio | `location.goToStudio` | "Naar de Studio" | ✅ OK | Prima. |
| To Stage | `studio.toStage` | "Naar het Podium" | ✅ OK | Goed. |

---

### 6. NOTIFICATIES & FEEDBACK

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Recorder is vol | `location.recorderFull` | OK | ✅ OK | Heel duidelijk en waarschuwend. "Je recorder is vol!" |
| Loading | `common.loading` | "Laden..." | ✅ OK | Standaard term. Prima. |
| Retry | `common.retry` | "Opnieuw proberen" | ✅ OK | Goed. |
| Geluiden konden niet worden geladen | `location.loadingError` | OK | ✅ OK | Duidelijk. Misschien "Sommige geluiden laden niet" voor vereenvoudiging? |

---

### 7. LEGENDE & INSTRUCTIES

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Hoe werkt het? | `start.howItWorks` | OK | ✅ OK | Prima. |
| Tutorial steps | `start.tutorialSteps` | Zie onderstaand | ✅ OK | **Stap 1:** "Verken een locatie en klik op de geluiden die je hoort" — Perfect. **Stap 2:** "Verzamel tot 6 geluiden in je recorder" — Prima. **Stap 3:** "Ga naar de studio en sleep je geluiden op de tijdlijn" — Goed, maar "Ordenen" kan als alternatief. **Stap 4:** "Combineer geluiden tot je eigen compositie!" — Goed, al beter dan "Maak een compositie". |
| Mijn Composities | `start.myCompositions` | "Mijn Nummers" of "Mijn Muziekstukken" | ⚠️ Deels | "Compositie" is abstract. Betere termen: "Nummers" of "Muziekstukken". |
| Ontdek geluiden, maak muziek! | `start.tagline` | OK | ✅ OK | Geweldig. Duidelijk en inspirerend. |

---

### 8. TEACHER MODE (voor kinderen zichtbaar bij "Deel met docent")

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Deel met docent | `stage.shareWithTeacher` | OK | ✅ OK | Heel duidelijk. |
| Klas-code | `teacher.shareWithTeacher.codePlaceholder` | "Klascode" | ✅ OK | Prima. Korte, duidelijke term. |
| Compositie | (in share context) | "Mijn Nummer" of "Mijn Muziekstuk" | ❌ Nee | Zie hoger: vervang waar mogelijk. |

---

### 9. EXPORT & DELEN

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Download MP3 | `stage.download` | OK | ✅ OK | Duidelijk. |
| Exporteren | `stage.exporting` | OK (alternatief: "Opslaan als MP3") | ⚠️ Deels | "Exporteren" is technisch. "Opslaan" of "Download bezig" is kindvriendelijker. Huidiging is acceptabel maar kan duidelijker. |
| Export Success | `stage.exportSuccess` | "Klaar! Je MP3 wordt gedownload." | ✅ OK | Prima feedback. |
| Share Link | `share.shareLink` | "Deel Link" | ✅ OK | Duidelijk. |
| Code | `share.code` | OK | ✅ OK | Duidelijk in context. |

---

### 10. ERROR & HELP

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Hulp nodig? | `feedback.helpButton` | OK | ✅ OK | Perfect. Vriendelijk en duidelijk. |
| Stuur foutmelding | `feedback.errorButton` | OK | ✅ OK | Prima. |
| Foutcode | `feedback.errorCodeLabel` | OK | ✅ OK | Duidelijk in context (voor ouders/docenten). |
| Iets werkt niet | `feedback.categories.bug.label` | OK | ✅ OK | Kind-vriendelijk geformuleerd. |
| Ik snap het niet | `feedback.categories.confusion.label` | OK | ✅ OK | Heel goed. Laagdrempelig. |

---

### 11. OPSLAG & INSTELLINGEN

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Opslaan | `stage.save` | OK | ✅ OK | Standaard, duidelijk. |
| Browsergegevens | `stage.saveWarning` | "Geheugen van je browser" | ⚠️ Deels | "Browsergegevens" kan verwarrend zijn voor kleine kinderen. "Geheugen van je browser" of "Opslagruimte op je computer" is duidelijker. |
| Storage Warning | `stage.saveWarning` | Vereenvoudigen: "Tip: Je composities worden opgeslagen in je browser. Als je dat wist, gaan ze weg." | ⚠️ Deels | Huidiging: "Je compositie wordt lokaal opgeslagen in je browser..." is te technisch. "Lokaal opgeslagen" is jargon. |

---

### 12. LIMIETEN & FEEDBACK

| Huidiging Term | i18n Key | Suggestie voor Kind (6-8 jr) | Huidiging Kind-Vriendelijk? | Opmerkingen |
|---|---|---|---|---|
| Max. 10 composities | (implicitig) | "Je kunt max. 10 nummers opslaan" | — | Goed gekozen: grens is duidelijk. Vervang "compositie" met "nummer". |
| Rate limiting | `feedback.rateLimitMessage` | "Even geduld! Wacht..." | ✅ OK | Prima. Vriendelijk en begripvol. |

---

## SAMENVATTING VAN AANBEVELINGEN

### 🔴 HOGE PRIORITEIT (direct vervangen)

| Huidiging | Alternatief | Reden |
|---|---|---|
| **Compositie** | "Mijn Nummer" of "Mijn Muziekstuk" | Te abstract voor 6-8 jarigen |
| **Bibliotheek** | "Mijn Geluiden" | Verwarring met boeken |
| **Samples** (waar direct zichtbaar) | "Geluiden" | Technisch jargon |
| **Dupliceren** | "Kopie maken" | Technisch jargon |

### 🟠 GEMIDDELDE PRIORITEIT (overwegen)

| Huidiging | Alternatief | Reden |
|---|---|---|
| **Browsergegevens** | "Geheugen van je browser" | Te technisch |
| **Tijdlijn** | "Speelbalk" of "Geluiden-schikking" | Abstract concept |
| **Tracks** | "Rijen" of "Sporen" | Abstractie van visueel element |
| **Exporteren** | "Opslaan" of "Download" | Technisch, overlap met save |

### 🟢 LAGE PRIORITEIT (huidiging is OK)

- Afspelen, Pauzeren, Stoppen, Terug, Herhalen (transport controls)
- Hulp nodig?, Ik snap het niet (feedback categoriën)
- Naar Studio, Naar Podium (navigatie)
- Opslaan, Terug, Verwijderen (acties)
- Hotspot-namen: "Lach", "Geit", "Hond", etc. (concrete dieren/objecten)

---

## IMPLEMENTATIE NOTITIES

1. **Starten met prioriteit:** Focus eerst op "Compositie" → "Nummer" en "Bibliotheek" → "Mijn Geluiden"
2. **A/B testing:** Bij grote wijzigingen (bv. compositie → nummer), overweeg brief user testing met 1-2 kids (6-8 jr)
3. **Consistency:** Zodra een term verandert, moet die consistent overal in de app gebruikt worden
4. **Translations:** Zorg dat Engels ("My Song" in plaats van "Composition") ook meeverandert
5. **Documentatie:** Update CLAUDE.md met nieuwe terminologie

---

## APPENDIX: ALLE GEBRUIKERSVRIENDELIJKE TERMEN (groen licht)

Deze termen zijn reeds goed gekozen en hoeven niet te veranderen:

- "Afspelen", "Pauzeren", "Stoppen", "Terug", "Herhalen"
- "Hulp nodig?", "Iets werkt niet", "Ik snap het niet"
- "Naar Studio", "Naar Podium", "Terug naar Kaart"
- "Verkennen", "Geluiden verzamelen", "Naar de studio"
- "Mijn Composities" (zodra "Compositie" → "Nummer")
- "Luister", "Verwijder", "Terug"
- Concrete sample-namen: "Lach", "Geit", "Hond", "Kippen", "Voetbal", etc.

---

**Opgesteld:** 27 februari 2026
**Voor review:** Product Owner & UX Team
