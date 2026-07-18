# Toekomst-ontwerp: "Samen één verhaal" — klassikaal storyboard (17-7-2026)

> **Status: toekomstige implementatie** — volledig uitgedacht op verzoek van Bert, zodat het idee bij oppakken direct helder is. Vereist: [leerling-codes v1](ONTWERP-LEERLING-CODES.md) (R3) en groepjes-fase F1 uit [ONTWERP-GROEPJES-SAMENWERKEN.md](ONTWERP-GROEPJES-SAMENWERKEN.md).

---

## 1. Het idee in één alinea

De klas maakt sámen de soundtrack van één beeldverhaal. De docent activeert een storyboard-opdracht met "verdeling aan"; de app verdeelt de kinderen (of bestaande groepjes) automatisch over de scènes — 25 kinderen over 5 scènes = vanzelf 5 groepjes van 5. Elk kind logt in met zijn leerling-code en ziet: **"Jouw scène: 3 — De sprong"**. Het componeert alléén die scène. Op vrijdag opent de docent het presentatiescherm en speelt het hele verhaal aaneen: scène 1 van groepje 1, scène 2 van groepje 2… één doorlopende klassencompositie waarin ieder kind zijn eigen stuk herkent.

## 2. Docent-flow

1. **Activeren**: in de startkeuze (of leskaart) kiest de docent een storyboard-opdracht en zet **"Verdeel de scènes over de klas"** aan.
2. **Verdeling**: 
   - Bestaan er al groepjes (F1)? → die worden gebruikt: elk groepje krijgt een scène (meer groepjes dan scènes → dubbele bezetting per scène; minder → sommige groepjes krijgen twee opeenvolgende scènes).
   - Geen groepjes? → de app verdeelt de leerling-codes gelijkmatig: M scènes, N kinderen → automatisch M "scène-groepjes" van ±N/M kinderen (dit zijn tijdelijke groepjes, alleen voor deze opdracht).
   - De docent ziet de verdeling vooraf als tabel (scène × pseudoniemen) en kan handmatig schuiven vóór hij bevestigt.
3. **Volgen**: het klaslokaal toont per scène de inzendstatus ("scène 2: 3 van de 5 ingeleverd") — het bestaande "wie heeft nog niet"-overzicht, gegroepeerd per scène.
4. **Presenteren**: één knop "Speel het hele verhaal" → presentatiescherm.

## 3. Leerling-flow

1. Inloggen met leerling-code → landingsscherm toont het storyboard mét jouw scène uitgelicht ("Jouw scène: 3 — De sprong", de andere scènes gedimd).
2. **Studio kadert op de scène**: de tijdlijn toont alleen het beat-bereik van die scène (de sectie-markers van het storyboard bepalen de grenzen — bestaat al in het sectie-model). Het kind componeert binnen dat kader; de scène-afbeelding staat groot in het StorytellingPanel (zoals de praatplaat-zoom nu).
3. Inleveren zoals altijd; de inzending draagt scène-index + (scène-)groepje.
4. Optioneel luisteren: "hoor het verhaal tot nu toe" — de aaneengeplakte versie met de al ingeleverde scènes (stilte waar nog niets is). Motiverend en zelfcorrigerend (sluit mijn scène aan op de vorige?).

## 4. Presentatie (de beloning)

- Het presentatiescherm (PresentationSurface) speelt de scènes **aaneen als één compositie**: per scène de inzending van dat groepje, beeld wisselt mee via het bestaande storyboard/sectie-mechanisme.
- Meerdere inzendingen per scène (dubbele bezetting of meerdere leden leverden in vóór F2): de docent kiest per scène welke versie "de film" haalt (selectierondje in het zijpaneel); de rest blijft afspeelbaar als alternatief.
- Zijpaneel = scènelijst i.p.v. losse inzendingen; klik = spring naar die scène. Fullscreen/montagelijn zoals altijd.
- Bonus later: dit aaneengeplakte geheel als **klas-album delen** (R4-albumcode) of als video exporteren (de video-export kan al secties → beelden).

## 5. Techniek (schets op bestaande bouwstenen)

- `class_assignments` + vlag `distribute_scenes BOOLEAN` en een verdeling-tabel `assignment_scene_slots` (assignment_id, scene_index, group_id) — of de verdeling als JSONB op de assignment (simpeler, geen joins; keuze bij bouw).
- Verdeling-algoritme: deterministisch, gelijkmatig, her-verdelen alleen expliciet door de docent (niet stiekem bij elke nieuwe leerling).
- Studio-kadering: sectiegrenzen van het storyboard (bestaan) + een "scene-lock" die de tijdlijn-viewport en plaatsing beperkt tot het bereik — verwant aan de bestaande template-locking.
- Aaneengeplakte weergave: playlist-item per scène met een start-offset; het presentatiescherm speelt ze sequentieel (auto-advance bestaat) — geen audio-mixage nodig.
- Geen realtime nodig; alles binnen het bestaande submissions-model.

## 6. Open ontwerpvragen voor het oppak-moment
1. Mag een kind ook aan een ándere scène werken als het klaar is (bonus-scènes), of strikt één?
2. "Hoor het verhaal tot nu toe" voor leerlingen: aan/uit per docent? (Kan afleiden of juist motiveren.)
3. Wat als een scène leeg blijft op presentatiedag — stilte, of de docent kiest een reserve (bv. een inzending uit een dubbel bezette scène)?
4. Verdient dit een eigen leskaart-type of is het een instelling op de bestaande storyboard-opdracht? (Voorstel: instelling — geen nieuw type.)
