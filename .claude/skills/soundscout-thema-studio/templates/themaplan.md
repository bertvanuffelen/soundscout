# Themaplan: {{THEMA_NAAM_NL}} (`{{THEME_ID}}`)

> Status: ☐ concept · ☐ goedgekeurd door Bert (datum: …)
> Model voor finale beelden: `nano_banana_pro` (Higgsfield CLI) · Begroot aantal generaties: {{N}} (≈ 2,5× het aantal finale beelden; 2 credits per stuk)

## 1. Concept

- **Onderwerp/wereld**: …
- **Doelgroep**: groep … · **Drukte-niveau**: …
- **Robot-flavor**: … (álles is een robot — vast; hier alleen de thema-flavor: roest,
  zeewier, houten-been-bouten, wintermuts, …)
- **Verhaal/rode draad**: …
- **Naam NL/EN**: … / … · **Beschrijving NL/EN**: … / …
- **isPublic**: true/false
- **Kleuren**: primary `#……` · accent `#……` · mapBackground `#……`
- **Belichting**: …
- **Seizoen** (`season`): … / geen

## 1b. Cast-rolverdeling

De 6 vaste mascotte-robots komen in élk thema terug (spec + canonieke portretten in de
beeld-skill, `stijl-cast.md`). Per lid: thema-flavor + rol in dit thema.

| Lid | Karakter | Flavor in dit thema | Rol / verhaallijn |
|---|---|---|---|
| Finn | avontuurlijke leider | … | … |
| Bolt | sterke enthousiasteling | … | … |
| Pip | nieuwsgierige energiebom | … | … |
| Nova | muzikale dromer | … | … |
| Ziggy | uitvinder | … | … |
| Mossy | rustige natuurliefhebber | … | … |

## 1c. Muziekcontract (alleen als er muziek per locatie komt)

Recept: `muziek-stems.md` in de geluiden-skill. Vul in vóór de eerste Suno-prompt.

- **Tempo**: 120 BPM (vast) · **Looplengte**: 4 maten = 8,000 s
- **Toonsoort**: … · **Vamp zoals Suno 'm werkelijk speelde**: … (pas invullen na de
  eerste groove — Suno negeert opgegeven schema's)
- **Basisfeel**: half-time / straight / double-time · **Later**: …
- **Instrumentrol per locatie**: … = … · … = …

## 1d. Promo (geen app-assets)

- **Titelbeeld** NL: ☐ · EN: ☐ (titel exact: "…" / "…", letterstijl: …)
- **Groepsposter** cast in dit thema: ☐

## 2. Locaties ({{AANTAL}} stuks)

### Locatie: {{LOCATION_ID}}
- **Naam NL/EN**: … / … · **Beschrijving NL/EN**: … / …
- **Achtergrondbeschrijving** (met alle geluidsbronnen zichtbaar, onderrand rustig): …
- **Samples** (6-8):

| sampleId | Naam NL / EN | Geluidsbeschrijving | Type | Icon | Kleur | Route |
|---|---|---|---|---|---|---|
| {{LOCATION_ID}}-… | … / … | … | sfx-2-8s \| loop-8.0s | Lucide-naam | #…… | F/H/C |

*(herhaal per locatie)*

## 3. Praatplaten ({{AANTAL}} stuks)

### Praatplaat: pp-{{NAAM}}
- **Naam NL/EN**: … / … · **category**: natuur/stad/gebouw/feest/fictie/overig
- **availableFor**: teacher/student/both · **themeId**: {{THEME_ID}}
- **Shot**: straatscène / dwarsdoorsnede / overzicht
- **Dominante kleur**: …
- **Zones/niveaus**: …
- **Activiteiten (20-30, elk → sample-id)**:

| # | Activiteit (personage + werkwoord + geluid) | sampleId(s) |
|---|---|---|
| 1 | … | … |

- **Dekking**: elke sample van de gekoppelde locatie(s) komt ≥1× voor: ☐ gecheckt
- **Verborgen zoekdetails (3-5)**: …

## 4. Storyboard

- **id**: {{SB_ID}} · **Naam NL/EN**: … / … · **Beschrijving NL/EN**: … / …
- **Held** (exacte beschrijving, letterlijk herhalen in elk frame-prompt): …
- **Frames (3-5)**:

| frameId | Label NL / EN | Handeling | Camerastandpunt |
|---|---|---|---|
| … | … / … | … | … |

- **coverImage**: frame … (meest dynamische)

## 5. Plattegrond

- **Wereldbeeld/lay-out**: …
- **Labels** (exact, HOOFDLETTERS): …
- **locationPositions (voorlopig)**:

| locationId | x | y | size |
|---|---|---|---|
| … | … | … | md |

## 6. Beeldproductie-lijst

| beeld-id | Type | Doelpad in package/ | Status | Iteraties |
|---|---|---|---|---|
| anker-01 | … | … | ☐ | 0 |

## 7. Concept-prompts

### {{BEELD_ID}}
```
(prompt volgens het stijlcontract van dit beeldtype)
```
