# Bouwplan: leerling-workflow (openingsscherm → podium)

> **Status:** in uitvoering · gestart 21-10-2026 · branch `claude/soundscout-podium-workflow-2268b6`
>
> **Bron (ontwerp en besluiten):** Kennis-map `soundscout/`
> - `workflow-leerling.md`: hoofddocument; bevindingen B1–B38, besluitenlog
> - `workflow-leerling-ronde4.md`: ronde 4; besluiten van 21-10, Engels-audit, woordenlijst, advies voor het openingsscherm
> - `workflow-leerling-podium-v4.html`: het klikbare doelontwerp
>
> **Werkwijze:**
> - Elke stap is één commit.
> - Elke stap sluit af met `npx tsc -b --noEmit` + `npm run test:run` groen.
> - Na elke stap wordt dit document bijgewerkt: de statuskolom, het commit-hash en de verificatie.
> - Migraties zijn additief en idempotent; Bert voert ze uit in de Supabase SQL Editor.
>
> **Legenda:** ⬜ open · 🔄 bezig · ✅ klaar · ⏸️ geparkeerd

---

## Overzicht

| Fase | Doel | Wanneer | Migratie |
|---|---|---|---|
| **0** | Fouten eruit (context, audio, data, podium-UI, Engelse sleutels) | **vóór 27-10** | nee |
| **1** | Openingsscherm opgeschoond + A1–A3, soundscape-termen, Engelse teksten | november | nee |
| **2** | Podium v4 ("Jouw soundscape", schermvullend) | dec–jan | nee |
| **3** | Titelinstelling van de docent + Engelse data (schuilnamen, feedbackkaarten) | daarna | **ja (klein)** |
| **4** | Live meenemen van docentwijzigingen · leerlingcodes (bestaand ontwerp `ONTWERP-LEERLING-CODES.md`) | later | ja |

---

## Fase 0: fouten eruit (vóór de lancering)

| Stap | Bevinding | Wat | Bestanden | Status | Commit |
|---|---|---|---|---|---|
| 0.1 | B21 | **Context wissen bij openen** via bewaarcode, "Mijn composities" en template. Zo wordt geen andere lokale compositie overschreven, gaat er niets naar een oude klas en blijven oude feedback en template niet hangen. | `utils/compositionInit.ts`, `components/compositions/CompositionsView.tsx` | ⬜ | |
| 0.2 | B22, B23 | **Podium speelt altijd de volledige mix, zonder loop.** Solo (store + engine) en de transport-loop worden gereset bij het openen van het podium en bij elk afspelen daar. | `components/stage/StageView.tsx`, `components/stage/StagePlayback.tsx`, `components/stage/StorytellingDisplay.tsx` | ⬜ | |
| 0.3 | B24, B25 | **Nieuwe compositie begint schoon:** secties, sequences, lengte en loop terug naar de standaard. De wizard zet de modus pas bij de definitieve keuze. | `stores/timelineStore.ts` (`resetTimeline`), `utils/compositionInit.ts`, `hooks/useStageModals.ts`, `components/start/NewCompositionWizard.tsx`, `components/StartScreen.tsx` | ⬜ | |
| 0.4 | B26 | **Volledige data** bij Bewaar online, Deel link, Deel met docent en Opslaan als opdracht (sequences + praatplaat + positie). Eén gedeelde builder in plaats van vier kopieën. | `components/stage/StageView.tsx`, `hooks/useStageSave.ts` | ⬜ | |
| 0.5 | B1, B2, B3, B5, B10, B18 | **Podium-UI:** feedbackblok op mobiel zonder overloop · opslaan zonder naam geeft zichtbare uitleg · label "Opnieuw inleveren" na het inleveren + statustekst "Klik op Lever in" · geen layout-sprong bij "Nu speelt" · ondertitels niet afgekapt · aria-labels op de speelknoppen | `components/common/FeedbackBanner.tsx`, `hooks/useStageSave.ts`, `components/stage/StageActionsModal.tsx`, `components/stage/StagePlayback.tsx`, `i18n/locales/*.json` | ⬜ | |
| 0.6 | B33, B34 | **Ontbrekende sleutels** `errors.networkTimeout`, `composeMode.noImages/noStoryboards` (NL + EN) · **onzichtbare ghost-knoppen** op het desktop-startscherm en het opdrachtscherm (eerst in de browser bevestigen) | `i18n/locales/*.json`, `components/start/StoryboardPicker.tsx`, `components/StartScreen.tsx`, `components/assignment/AssignmentLandingScreen.tsx` | ⬜ | |
| 0.7 | — | **Eindcontrole fase 0:** browserdoorloop (klasroute, bewaarcode, Mijn composities, zelf beginnen), `npm run build`, `npm run lint` | — | ⬜ | |

**Bewust níet in fase 0:**
- B30 (storyboardpijlen springen niet in de muziek) en B31 (de lichtbak slaat sequences over). Die vervallen of veranderen in fase 2, omdat de presentatiemodus de lichtbak vervangt.
- B32 (persistentie bij herladen). Dat is A1 in fase 1.

## Fase 1: openingsscherm (november)

| Stap | Wat | Status |
|---|---|---|
| 1.1 | Soundscape-termen in alle leerlingteksten (NL + EN) volgens de woordenlijst in ronde 4 §7; geen verkleinwoorden | ⬜ |
| 1.2 | Startscherm opgeschoond: "Ben je docent?" als link, tagline, tabtitel "SoundScout", wizard zonder dubbele code-ingang | ⬜ |
| 1.3 | Codevenster: één kop + uitleg per codesoort, "Open" met tekst op mobiel | ⬜ |
| 1.4 | Klas zonder opdracht: "Andere code" opent het codevenster, "Zelf beginnen" opent de wizard (O7) | ⬜ |
| 1.5 | **A1** Verder-kaart: werk + `classSession` lokaal bewaren, zodat ze herladen overleven (B32) | ⬜ |
| 1.6 | **A2** Klasbewuste "Nieuwe soundscape" (startscherm + podium): "Nog één voor deze opdracht" / "Zelf iets nieuws" | ⬜ |
| 1.7 | **A3** Uitleg één keer na "Starten" in de klasroute | ⬜ |
| 1.8 | Engelse teksten volgens de audit (ronde 4 §6): termen, zinsletters, VK-spelling, meervouden `_one/_other` + ClassCard-dubbeltelling, Engelse privacylink, harde teksten via i18n | ⬜ |

## Fase 2: podium v4

| Stap | Wat | Status |
|---|---|---|
| 2.1 | Schermvullende layout: beeld links, kolom "Jouw soundscape" rechts (320 px); op mobiel onder elkaar | ⬜ |
| 2.2 | Stappencomponent met statusafleiding (luisteren · titel · plek · inleveren/bewaren · feedback · klasgenoten · exporteren), in vrije volgorde | ⬜ |
| 2.3 | Opdrachtkaart en tijdsduur meenemen in `ClassSession`, tonen als "Opdracht" | ⬜ |
| 2.4 | Presentatiemodus voor "Luister" (PresentationSurface hergebruiken) | ⬜ |
| 2.5 | Beeldvlak per situatie: storyboard met strip (springt in de muziek), afbeelding, praatplaat met pin + zoom, tijdlijn als beeld | ⬜ |
| 2.6 | Feedback klasgenoten op het volle scherm (links compositie, rechts sterren) | ⬜ |
| 2.7 | Muziekkaart (code + QR); één inleverpad (klascode zet de klassessie); "Bewaar" zonder naam | ⬜ |
| 2.8 | Versies: "Lever versie N in" bij wijzigingen sinds het inleveren | ⬜ |

## Fase 3: instellingen en data (migratie)

| Stap | Wat | Status |
|---|---|---|
| 3.1 | Migratie: `class_assignments.students_type_title BOOLEAN DEFAULT true` + doorgeven in `get_active_assignment` | ⬜ |
| 3.2 | Docent-UI: schakelaar in ClassDetail; leerling: automatische titel, geen invoer, geen dobbelsteen | ⬜ |
| 3.3 | Engelse schuilnamen (`randomNames.ts`) + vertaalde ingebouwde feedbackkaarten | ⬜ |

## Fase 4: later

- Live meenemen: de opdracht opnieuw ophalen bij het openen van het podium (peer-feedback, kaart).
- Leerlingcodes: zie het besloten ontwerp `ONTWERP-LEERLING-CODES.md` (R3).

---

## Logboek

| Datum | Stap | Commit | Verificatie |
|---|---|---|---|
| 21-10-2026 | Bouwplan opgesteld | | — |
