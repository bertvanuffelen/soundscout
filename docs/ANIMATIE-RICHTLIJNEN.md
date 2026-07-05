# Animatie-richtlijnen — looping animaties robuust maken

> Les uit de tijdlijn-animatie-bug (HeroPreview, docentenpagina). Deze briefing
> kun je één-op-één doorgeven aan een AI/ontwikkelaar die animaties bouwt.

## Het probleem dat we tegenkwamen

Een looping-animatie werd aangestuurd met een **keten van `setTimeout`'s**
(stap-voor-stap "sleep") plus **WAAPI-animaties met `fill: 'forwards'`**, in een
functie die zichzelf aan het eind opnieuw aanriep. Eerst werkte het; na een tijd
(of na een tab-wissel) verschenen alle elementen ineens tegelijk i.p.v.
gestaggerd, en pas daarna liep de rest. Een page-refresh "repareerde" het
tijdelijk.

**Oorzaken (ze versterken elkaar):**

1. **`setTimeout` wordt geknepen en gebatcht.** Op een achtergrond-tab (of bij
   throttling na verloop van tijd) worden getimede stapjes uitgesteld en vuren
   daarna in één klap af → alle "verschijn"-stappen tegelijk.
2. **React StrictMode start effects in dev twee keer** → met een setTimeout-keten
   kunnen twee lussen licht uit fase raken.
3. **`fill: 'forwards'`-toestand blijft hangen** en moet je handmatig
   cancellen/resetten tussen lussen — foutgevoelig.

## De vuistregel

> **Stuur een looping-animatie NIET aan met een keten van `setTimeout`'s die
> zichzelf herstart. Gebruik één `requestAnimationFrame`-klok en bereken elke
> frame de staat volledig uit `verstreken tijd % lusduur`.**

Waarom dit alles oplost:

- **Deterministisch & idempotent:** elke lus is per definitie identiek; ook als
  het effect twee keer start (StrictMode) rekenen beide dezelfde waarden uit →
  geen zichtbaar verschil.
- **Geen drift/batching:** `rAF` is frame-gesynchroniseerd, pauzeert netjes op
  een achtergrond-tab en hervat in de juiste fase (geen burst).
- **Geen blijvende toestand:** je zet elke frame `opacity`/`transform`/`filter`
  expliciet — niets kan "blijven hangen".

## Checklist voor elke animatie

1. **Timeline als getallen.** Leg alle fasen vast als ms-constanten (delay,
   stagger, duur, pauze) en bereken één `PERIOD`. Element-staat = functie van
   `t = (now - start) % PERIOD`.
2. **Eén `requestAnimationFrame`-lus**, geen `setTimeout`-ketens, geen
   `setInterval`, geen zelf-recursieve `run()`.
3. **`prefers-reduced-motion`:** WAAPI/`element.animate()` én rAF **negeren de
   CSS-media-query** `@media (prefers-reduced-motion)`. Je moet dit dus **in JS
   checken** (`window.matchMedia('(prefers-reduced-motion: reduce)').matches`) en
   dan een **statische eindstaat** tonen (geen lus).
4. **Cleanup verplicht:** in React `return () => cancelAnimationFrame(raf)` in de
   `useEffect`; buiten React idem bij teardown.
5. **Vermijd `fill: 'forwards'` als "geheugen" tussen lussen.** Zet staat elke
   frame zelf; reken niet op resterende animatie-effecten.
6. **Geen gedeelde mutable staat tussen mogelijke dubbele starts.** Houd alles
   binnen de effect-closure; laat de rAF-frame idempotent zijn (alleen schrijven
   o.b.v. `t`).
7. **Test bewust de randgevallen:** laat het 2–3 minuten lopen, wissel van tab en
   terug, en test met "reduce motion" aan. Niet alleen de eerste 10 seconden.

## Minimaal patroon (React) om te hergebruiken

```tsx
useEffect(() => {
  const els = /* query je elementen */;
  const PERIOD = /* som van je fasen in ms */;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // statische eindstaat zetten, geen lus
    return;
  }

  let raf = 0;
  let start: number | null = null;
  const frame = (now: number) => {
    if (start === null) start = now;
    const t = (now - start) % PERIOD;      // 0..PERIOD, herhaalt
    // bereken per element opacity/transform/filter puur uit t en zet ze
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}, []);
```

## Wanneer mag WAAPI / CSS-keyframes wél?

Voor **losse, niet-gekoppelde** loops (bijv. één icoon dat pulseert) zijn
CSS-`@keyframes` met `animation: ... infinite` prima — die zijn ook
deterministisch en respecteren de reduced-motion-media-query vanzelf. Het misging
specifiek bij een **gesequencete, meerfasige loop** (verschijnen → afspeellijn →
fade → herhaal) die met getimede stapjes aan elkaar hing. Zodra fasen van elkaar
afhangen: **één rAF-klok**.

## Referentie-implementatie in deze repo

`src/components/teacher-landing/HeroPreview.tsx` → `VrijPreview` bevat de
werkende rAF-versie (gestaggerde pop-in → afspeellijn met glow → fade → lus,
met reduced-motion-fallback). Gebruik die als voorbeeld.
