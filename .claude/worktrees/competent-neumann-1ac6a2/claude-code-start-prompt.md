# SoundScout - Startinstructies voor Claude Code

## Context
Je gaat SoundScout bouwen, een educatief muziekspel voor kinderen van 8-12 jaar. Lees eerst grondig de `soundscout-prd.md` in deze map. Dit is je enige bron van waarheid.

## Werkwijze (STRIKT VOLGEN)

### Principe 1: Kleine stappen
- Werk in kleine, testbare incrementen
- Eén component of feature per stap
- Geen grote refactors zonder expliciete goedkeuring

### Principe 2: Test-gedreven
- Schrijf eerst een test (of testplan) voordat je implementeert
- Test handmatig EN geautomatiseerd waar mogelijk
- Pas NA minimaal 2 succesvolle tests ga je naar de volgende stap
- Documenteer testresultaten in `todo-implementatie.md`

### Principe 3: Architectuur eerst
- Bouw een solide, uitbreidbare basis
- Types en interfaces VOOR implementatie
- Denk aan toekomstige locaties, samples, en features

### Principe 4: Documentatie
- Houd `todo-implementatie.md` actueel bij elke stap
- Markeer voltooide taken met [x] en datum
- Noteer blokkades of vragen voor de gebruiker

---

## Opdracht

### Stap 0: Lees en analyseer
1. Lees `soundscout-prd.md` volledig
2. Maak `todo-implementatie.md` met een gefaseerd implementatieplan
3. Identificeer alle technische beslissingen die genomen moeten worden
4. Wacht op goedkeuring voordat je verdergaat

### Stap 1: Project setup
Pas NA goedkeuring van stap 0:
1. Initialiseer Vite + React + TypeScript project
2. Installeer dependencies: Tone.js, Zustand, dnd-kit, Tailwind CSS
3. Configureer TypeScript strict mode
4. Maak basis mappenstructuur aan (zie PRD sectie 4.2)
5. Creëer `public/audio/` en `public/images/locations/` mappen (leeg, gebruiker vult later)
6. Test: `npm run dev` moet starten zonder errors
7. Test: TypeScript compileert zonder errors

### Stap 2: Type definities
1. Maak `src/types/index.ts` met ALLE interfaces uit PRD sectie 4.3
2. Exporteer alle types
3. Test: Geen TypeScript errors

### Stap 3: Data configuratie
1. Maak `src/data/locations.json` met park-locatie (placeholder hotspots)
2. Maak `src/data/samples.json` met placeholder sample definities
3. Maak type-safe loaders voor deze JSON bestanden
4. Test: JSON laadt correct met juiste types

### Stap 4: State management
1. Maak Zustand stores: `gameStore.ts`, `audioStore.ts`, `libraryStore.ts`
2. Implementeer basis actions (geen audio logic nog)
3. Test: State updates correct in React DevTools

### Stap 5: Audio engine basis
1. Maak `src/hooks/useAudioEngine.ts`
2. Implementeer: loadSample, playSample, stopSample
3. Gebruik placeholder/test audio bestand
4. Test: Sample laadt en speelt af in browser

(Verdere stappen volgen na succesvolle basis)

---

## Verwachte output na Stap 0

Een `todo-implementatie.md` bestand met:
1. Gefaseerd implementatieplan (alle stappen uitgeschreven)
2. Per stap: concrete taken, acceptatiecriteria, geschatte complexiteit
3. Technische beslissingen en overwegingen
4. Vragen voor de gebruiker (indien van toepassing)
5. Risico's en mitigaties

---

## Mappenstructuur na Stap 1

```
soundscout/
├── public/
│   ├── audio/
│   │   └── locations/
│   │       └── park/
│   │           └── (gebruiker plaatst hier samples)
│   └── images/
│       └── locations/
│           └── (gebruiker plaatst hier afbeeldingen)
├── src/
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   ├── data/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── todo-implementatie.md
├── soundscout-prd.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Belangrijke regels

1. **GEEN audio/image bestanden maken** - gebruiker levert deze aan
2. **GEEN shortcuts** - volg het stappenplan exact
3. **GEEN aannames** - vraag bij twijfel
4. **WEL placeholder configs** - gebruik dummy data met correcte structuur
5. **WEL uitgebreide comments** - code moet zelf-documenterend zijn

---

## Start commando

Begin met Stap 0. Lees de PRD en maak het implementatieplan. Toon mij het plan voordat je code schrijft.
