# Themaplan: {{THEMA_NAAM_NL}} (`{{THEME_ID}}`)

> Status: ☐ concept · ☐ goedgekeurd door Bert (datum: …)
> Model voor finale beelden: `gemini-3-pro-image` · Begroot aantal generaties: {{N}}

## 1. Concept

- **Onderwerp/wereld**: …
- **Doelgroep**: groep … · **Drukte-niveau**: …
- **Personage-conventie**: … (nooit fotorealistische mensen)
- **Verhaal/rode draad**: …
- **Naam NL/EN**: … / … · **Beschrijving NL/EN**: … / …
- **isPublic**: true/false
- **Kleuren**: primary `#……` · accent `#……` · mapBackground `#……`
- **Belichting/seizoen**: …

## 2. Locaties ({{AANTAL}} stuks)

### Locatie: {{LOCATION_ID}}
- **Naam NL/EN**: … / … · **Beschrijving NL/EN**: … / …
- **Achtergrondbeschrijving** (met alle geluidsbronnen zichtbaar, onderrand rustig): …
- **Samples** (6-8):

| sampleId | Naam NL / EN | Geluidsbeschrijving | Type | Icon | Kleur | Route |
|---|---|---|---|---|---|---|
| {{LOCATION_ID}}-… | … / … | … | sfx-2-8s \| loop-8.0s | Lucide-naam | #…… | F/E/C |

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
