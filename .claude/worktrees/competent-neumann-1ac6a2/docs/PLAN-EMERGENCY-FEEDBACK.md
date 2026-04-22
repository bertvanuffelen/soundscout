# Emergency/Feedback Systeem - Implementatieplan

**Datum:** 2026-02-05
**Status:** PLAN - Wacht op goedkeuring
**Prioriteit:** P2 (#15)

---

## 1. Samenvatting

Een feedback/hulp systeem waarmee gebruikers problemen kunnen melden. Het systeem heeft twee modi:

| Modus | Trigger | Locatie | Doel |
|-------|---------|---------|------|
| **Emergency** | Automatisch bij crash/error | ErrorBoundary | Foutcode + context direct mailen |
| **Hulp nodig** | Handmatig klikken | StartScreen footer | Algemene feedback/problemen melden |
| **Settings** | Handmatig klikken | Settings menu (later) | Idem, voor toekomstige uitbreiding |

---

## 2. Wat We Al Hebben (Analyse)

### 2.1 Bestaande ErrorBoundary
**Locatie:** `src/components/common/ErrorBoundary.tsx`

```typescript
// Huidige state - error info is al beschikbaar!
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;  // ← Bevat message + stack trace
}

// In componentDidCatch wordt dit al gelogd:
logger.error('React error boundary caught error', {
  error: error.message,
  stack: error.stack,
  componentStack: errorInfo.componentStack,
});
```

**Conclusie:** De error data is al beschikbaar, we hoeven alleen een "Stuur foutmelding" knop toe te voegen.

### 2.2 Bestaande Modal Component
**Locatie:** `src/components/ui/Modal.tsx`

Volledig functioneel met:
- Backdrop click to close
- Escape key to close
- Responsive sizing (sm/md/lg)
- Title + children slots

**Conclusie:** Herbruikbaar voor feedback formulier.

### 2.3 Bestaande i18n Structuur
**Locatie:** `src/i18n/locales/nl.json` en `en.json`

Volledig opgezet met Nederlandse en Engelse vertalingen.

**Conclusie:** Voeg nieuwe `feedback` sectie toe.

### 2.4 Bestaande Supabase Setup
**Locatie:** `src/lib/supabase.ts`

Al geconfigureerd voor het klas-code systeem met `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`.

**Conclusie:** Kunnen we hergebruiken als alternatief voor EmailJS.

### 2.5 StartScreen Layout
**Locatie:** `src/components/StartScreen.tsx`

Footer bevat al:
- "Gemaakt door Bert van Uffelen"
- Info knop (Over deze app)
- Social media links

**Conclusie:** "Hulp nodig?" knop past perfect in deze footer.

---

## 3. Architectuur Beslissingen

### 3.1 Email Service: EmailJS vs Supabase

| Aspect | EmailJS | Supabase |
|--------|---------|----------|
| **Setup** | Externe service, API keys nodig | Al geconfigureerd |
| **Kosten** | Gratis tot 200 emails/maand | Gratis (database opslag) |
| **Delivery** | Direct naar inbox | Moet handmatig checken of webhook |
| **Offline** | Faalt silently | Kan lokaal queuen |
| **Privacy** | Data naar derde partij | Data blijft in eigen Supabase |

**Aanbeveling:** Start met **EmailJS** (direct in inbox = sneller reageren), met fallback logging naar console als EmailJS faalt.

### 3.2 Formulier: Optie A (categorie + beschrijving)

Gekozen omdat:
1. Geeft meer context over het probleem
2. Gebruiker kan eigen woorden gebruiken
3. Categorie helpt bij prioritering
4. Niet te complex - slechts 2 velden

**Categorieën voor SoundScout:**

| ID | NL Label | EN Label | Icoon | Beschrijving |
|----|----------|----------|-------|--------------|
| `bug` | Iets werkt niet | Something broken | 🐛 | Technische problemen |
| `audio` | Geluid probleem | Audio issue | 🔇 | Geluid speelt niet, hapert |
| `confusion` | Ik snap het niet | I don't understand | ❓ | UX/begrijpelijkheid |
| `other` | Anders | Other | 💬 | Overige feedback |

### 3.3 Rate Limiting Uitleg

**Wat is rate limiting?**
Een beveiliging die voorkomt dat gebruikers te veel berichten in korte tijd sturen.

**Waarom nodig?**
- Voorkomt spam (per ongeluk of opzettelijk)
- Beschermt EmailJS quota (200 gratis/maand)
- Voorkomt dat boze gebruikers 100x klikken

**Implementatie:**
```typescript
const RATE_LIMIT_MS = 60000; // 60 seconden
let lastSubmitTime = 0;

function canSubmit(): boolean {
  const now = Date.now();
  if (now - lastSubmitTime < RATE_LIMIT_MS) {
    return false; // Te snel, wacht even
  }
  lastSubmitTime = now;
  return true;
}
```

**UX:** Na verzenden tonen we "Bedankt! Je kunt over 60 seconden opnieuw feedback sturen."

---

## 4. Data die Verstuurd Wordt

### 4.1 Bij Error (Emergency Mode)

```typescript
interface ErrorReport {
  // Identificatie
  app: 'SoundScout';
  type: 'error';
  timestamp: string;           // ISO 8601

  // Error details (KRITIEK - dit wil je!)
  errorMessage: string;        // "Cannot read property 'x' of undefined"
  errorStack: string;          // Stack trace met line numbers
  componentStack?: string;     // React component hierarchy

  // Context
  url: string;                 // Welke pagina/scherm
  screen: GameScreen;          // 'start' | 'map' | 'location' | 'studio' | 'stage'

  // Device info
  userAgent: string;           // Browser + OS
  screenSize: string;          // "1920x1080"

  // Optioneel (gebruiker kan toevoegen)
  userMessage?: string;        // "Ik klikte op X en toen crashte het"
  userEmail?: string;          // Voor follow-up
}
```

### 4.2 Bij "Hulp nodig" (Manual Mode)

```typescript
interface FeedbackReport {
  // Identificatie
  app: 'SoundScout';
  type: 'feedback';
  timestamp: string;

  // Feedback details
  category: 'bug' | 'audio' | 'confusion' | 'other';
  message: string;             // Min 10 karakters

  // Context
  url: string;
  screen: GameScreen;

  // Device info
  userAgent: string;
  screenSize: string;

  // Optioneel
  userEmail?: string;
}
```

---

## 5. Component Structuur

### 5.1 Nieuwe Bestanden

```
src/
├── components/
│   └── feedback/
│       ├── index.ts                 # Exports
│       ├── FeedbackModal.tsx        # Hoofd modal component
│       ├── FeedbackButton.tsx       # Herbruikbare trigger knop
│       └── FeedbackService.ts       # EmailJS integratie
├── types/
│   └── feedback.ts                  # Type definitions (of in index.ts)
```

### 5.2 FeedbackModal.tsx

```tsx
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Mode bepaalt welke UI getoond wordt
  mode: 'error' | 'feedback';

  // Bij error mode: error data meegeven
  errorData?: {
    message: string;
    stack?: string;
    componentStack?: string;
  };
}

// Component toont:
// - Header: "SoundScout - [Foutmelding / Hulp nodig]"
// - Bij error: foutcode preview (ingeklapt)
// - Categorie selectie (alleen bij feedback mode)
// - Beschrijving textarea
// - Email veld (optioneel)
// - Verstuur knop
// - Rate limit feedback
```

### 5.3 FeedbackButton.tsx

```tsx
interface FeedbackButtonProps {
  variant: 'footer' | 'error';  // Styling variant
  onClick: () => void;
}

// Footer variant: subtiele link "Hulp nodig?"
// Error variant: rode knop "Stuur foutmelding"
```

### 5.4 FeedbackService.ts

```typescript
// Verzamelt context automatisch
function collectContext(): ContextData {
  return {
    url: window.location.href,
    screen: getCurrentScreen(), // Uit gameStore
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  };
}

// Valideert input
function validateFeedback(data: FeedbackInput): ValidationResult {
  // - Categorie verplicht (bij feedback mode)
  // - Bericht minimaal 10 karakters
  // - Email formaat check (als ingevuld)
}

// Checkt rate limit
function checkRateLimit(): boolean { ... }

// Verstuurt via EmailJS
async function sendFeedback(data: FeedbackReport): Promise<SendResult> {
  // 1. Check rate limit
  // 2. Validate
  // 3. Collect context
  // 4. Send via EmailJS
  // 5. Return success/error
}
```

---

## 6. Integratie Punten

### 6.1 ErrorBoundary Aanpassing

**Bestand:** `src/components/common/ErrorBoundary.tsx`

```tsx
// VOOR (huidige situatie)
<button onClick={this.handleRetry}>
  Probeer opnieuw
</button>

// NA (met feedback knop)
<div className="flex gap-3">
  <button onClick={this.handleRetry}>
    Probeer opnieuw
  </button>
  <button onClick={() => this.setState({ showFeedback: true })}>
    Stuur foutmelding
  </button>
</div>

{this.state.showFeedback && (
  <FeedbackModal
    isOpen={true}
    onClose={() => this.setState({ showFeedback: false })}
    mode="error"
    errorData={{
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.componentStack,
    }}
  />
)}
```

### 6.2 StartScreen Footer

**Bestand:** `src/components/StartScreen.tsx`

```tsx
// VOOR (huidige footer)
<footer>
  <span>Gemaakt door Bert van Uffelen</span>
  <button>Info</button>
  <SocialLinks />
</footer>

// NA (met hulp knop)
<footer>
  <span>Gemaakt door Bert van Uffelen</span>
  <button onClick={() => setShowFeedback(true)}>
    Hulp nodig?
  </button>
  <button>Info</button>
  <SocialLinks />
</footer>

{showFeedback && (
  <FeedbackModal
    isOpen={true}
    onClose={() => setShowFeedback(false)}
    mode="feedback"
  />
)}
```

### 6.3 Settings Menu (Later)

Placeholder voor toekomstige implementatie. De FeedbackModal is al herbruikbaar, dus integratie is simpel:

```tsx
// In toekomstig SettingsPanel.tsx
<button onClick={() => setShowFeedback(true)}>
  Feedback geven
</button>
```

---

## 7. EmailJS Setup

### 7.1 Benodigde Stappen

1. **EmailJS Account aanmaken** op https://www.emailjs.com/
2. **Email Service koppelen** (Gmail, Outlook, etc.)
3. **Template aanmaken** met variabelen
4. **API Keys ophalen:**
   - Service ID
   - Template ID
   - Public Key

### 7.2 Email Template

```
Subject: [SoundScout] {{type}} - {{category}}

App: {{app}}
Type: {{type}}
Tijdstip: {{timestamp}}

---

{{#if errorMessage}}
FOUTMELDING:
{{errorMessage}}

STACK TRACE:
{{errorStack}}

COMPONENT STACK:
{{componentStack}}
{{/if}}

{{#if category}}
CATEGORIE: {{category}}
{{/if}}

BESCHRIJVING:
{{message}}

---

CONTEXT:
- URL: {{url}}
- Scherm: {{screen}}
- Device: {{userAgent}}
- Schermgrootte: {{screenSize}}

{{#if userEmail}}
REPLY TO: {{userEmail}}
{{/if}}
```

### 7.3 Environment Variables

```bash
# .env.local (toevoegen aan bestaande)
VITE_EMAILJS_SERVICE_ID=service_xxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxx
```

---

## 8. UI/UX Design

### 8.1 Error Mode (bij crash)

```
┌─────────────────────────────────────────────┐
│  SoundScout                                 │
│  ─────────────────────────────────────────  │
│                                             │
│  😵 Oeps! Er ging iets mis                  │
│                                             │
│  Er is een onverwachte fout opgetreden.     │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ▶ Foutcode (klik om te bekijken)    │    │
│  │   TypeError: Cannot read property   │    │
│  │   'duration' of undefined           │    │
│  │   at Clip.tsx:45                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Wil je deze fout melden?                   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Wat deed je toen dit gebeurde?      │    │
│  │ (optioneel)                         │    │
│  │                                     │    │
│  │ ________________________________    │    │
│  │ ________________________________    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Email (optioneel, voor follow-up)   │    │
│  │ ________________________________    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌──────────────┐  ┌──────────────────┐     │
│  │ Opnieuw     │  │ Stuur foutmelding│     │
│  │ proberen    │  │       📧         │     │
│  └──────────────┘  └──────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

### 8.2 Feedback Mode (hulp nodig)

```
┌─────────────────────────────────────────────┐
│  SoundScout - Hulp nodig?              ✕    │
│  ─────────────────────────────────────────  │
│                                             │
│  Wat voor probleem heb je?                  │
│                                             │
│  ┌───────────┐ ┌───────────┐                │
│  │ 🐛        │ │ 🔇        │                │
│  │ Iets      │ │ Geluid    │                │
│  │ werkt niet│ │ probleem  │                │
│  └───────────┘ └───────────┘                │
│  ┌───────────┐ ┌───────────┐                │
│  │ ❓        │ │ 💬        │                │
│  │ Ik snap   │ │ Anders    │                │
│  │ het niet  │ │           │                │
│  └───────────┘ └───────────┘                │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Beschrijf je probleem *             │    │
│  │                                     │    │
│  │ ________________________________    │    │
│  │ ________________________________    │    │
│  │ ________________________________    │    │
│  │                         23/500     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Email (optioneel)                   │    │
│  │ ________________________________    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│         ┌──────────────────────┐            │
│         │   Verstuur feedback  │            │
│         │         📧           │            │
│         └──────────────────────┘            │
│                                             │
└─────────────────────────────────────────────┘
```

### 8.3 Success State

```
┌─────────────────────────────────────────────┐
│  SoundScout - Hulp nodig?              ✕    │
│  ─────────────────────────────────────────  │
│                                             │
│              ✅                              │
│                                             │
│        Bedankt voor je feedback!            │
│                                             │
│   We hebben je bericht ontvangen en         │
│   kijken er zo snel mogelijk naar.          │
│                                             │
│         ┌──────────────────────┐            │
│         │       Sluiten        │            │
│         └──────────────────────┘            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 9. Vertalingen

### 9.1 Nederlands (nl.json)

```json
{
  "feedback": {
    "helpButton": "Hulp nodig?",
    "errorButton": "Stuur foutmelding",

    "titleError": "Foutmelding versturen",
    "titleFeedback": "Hulp nodig?",

    "errorIntro": "Er is een fout opgetreden. Wil je deze melden?",
    "feedbackIntro": "Wat voor probleem heb je?",

    "errorCodeLabel": "Foutcode (klik om te bekijken)",
    "whatHappened": "Wat deed je toen dit gebeurde?",
    "whatHappenedPlaceholder": "Bijv. ik klikte op de play knop en toen...",

    "descriptionLabel": "Beschrijf je probleem",
    "descriptionPlaceholder": "Vertel wat er mis gaat...",
    "descriptionHint": "Minimaal 10 karakters",

    "emailLabel": "Email (optioneel)",
    "emailPlaceholder": "Voor eventuele follow-up vragen",

    "submitError": "Stuur foutmelding",
    "submitFeedback": "Verstuur feedback",
    "submitting": "Versturen...",
    "retry": "Opnieuw proberen",

    "successTitle": "Bedankt!",
    "successMessage": "We hebben je bericht ontvangen en kijken er zo snel mogelijk naar.",
    "close": "Sluiten",

    "rateLimitMessage": "Je kunt over {{seconds}} seconden opnieuw feedback sturen.",

    "categories": {
      "bug": {
        "label": "Iets werkt niet",
        "desc": "Er gaat iets fout"
      },
      "audio": {
        "label": "Geluid probleem",
        "desc": "Geluid speelt niet of hapert"
      },
      "confusion": {
        "label": "Ik snap het niet",
        "desc": "Iets is onduidelijk"
      },
      "other": {
        "label": "Anders",
        "desc": "Andere feedback"
      }
    },

    "validation": {
      "categoryRequired": "Kies een categorie",
      "messageRequired": "Beschrijf je probleem",
      "messageTooShort": "Minimaal 10 karakters",
      "emailInvalid": "Ongeldig email adres"
    },

    "error": {
      "sendFailed": "Versturen mislukt. Probeer het later opnieuw.",
      "networkError": "Geen internetverbinding"
    }
  }
}
```

### 9.2 Engels (en.json)

```json
{
  "feedback": {
    "helpButton": "Need help?",
    "errorButton": "Report error",

    "titleError": "Report Error",
    "titleFeedback": "Need help?",

    "errorIntro": "An error occurred. Would you like to report it?",
    "feedbackIntro": "What kind of problem do you have?",

    "errorCodeLabel": "Error code (click to view)",
    "whatHappened": "What were you doing when this happened?",
    "whatHappenedPlaceholder": "E.g. I clicked the play button and then...",

    "descriptionLabel": "Describe your problem",
    "descriptionPlaceholder": "Tell us what's going wrong...",
    "descriptionHint": "Minimum 10 characters",

    "emailLabel": "Email (optional)",
    "emailPlaceholder": "For follow-up questions",

    "submitError": "Report error",
    "submitFeedback": "Send feedback",
    "submitting": "Sending...",
    "retry": "Try again",

    "successTitle": "Thank you!",
    "successMessage": "We received your message and will look into it as soon as possible.",
    "close": "Close",

    "rateLimitMessage": "You can send feedback again in {{seconds}} seconds.",

    "categories": {
      "bug": {
        "label": "Something broken",
        "desc": "Something isn't working"
      },
      "audio": {
        "label": "Audio problem",
        "desc": "Sound not playing or glitching"
      },
      "confusion": {
        "label": "I don't understand",
        "desc": "Something is unclear"
      },
      "other": {
        "label": "Other",
        "desc": "Other feedback"
      }
    },

    "validation": {
      "categoryRequired": "Please select a category",
      "messageRequired": "Please describe your problem",
      "messageTooShort": "Minimum 10 characters",
      "emailInvalid": "Invalid email address"
    },

    "error": {
      "sendFailed": "Failed to send. Please try again later.",
      "networkError": "No internet connection"
    }
  }
}
```

---

## 10. Risico Analyse

### 10.1 Technische Risico's

| Risico | Impact | Kans | Mitigatie |
|--------|--------|------|-----------|
| EmailJS quota bereikt (200/maand) | Medium | Laag | Rate limiting + monitoring |
| EmailJS service down | Medium | Laag | Fallback naar console.log + localStorage queue |
| Spam/misbruik door gebruikers | Laag | Medium | Rate limiting (60s) |
| Email komt in spam | Medium | Medium | Goede subject line, whitelisting |
| Error data te lang voor email | Laag | Medium | Truncate stack trace tot 2000 chars |

### 10.2 Privacy Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Persoonlijke data in error stack | Medium | Alleen technische data, geen user content |
| Email adres opslaan | Laag | Email is optioneel, niet verplicht |
| Data naar derde partij (EmailJS) | Laag | Standaard voor email services, GDPR compliant |

### 10.3 UX Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Gebruiker snapt modal niet | Medium | Eenvoudige taal, duidelijke categorieën |
| Te veel velden = gebruiker haakt af | High | Slechts 2-3 velden, email optioneel |
| Rate limit frustreert gebruiker | Low | Duidelijke feedback over wachttijd |

### 10.4 Implementatie Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| ErrorBoundary aanpassing breekt bestaande error handling | High | Voorzichtig testen, git backup |
| Class component (ErrorBoundary) + hooks (FeedbackModal) | Medium | FeedbackModal als apart component, niet in class |
| EmailJS keys exposed in frontend | Low | Public keys zijn bedoeld voor frontend, rate limiting op EmailJS side |

---

## 11. Implementatie Fases

### Fase 1: EmailJS Setup (extern)
**Geschatte tijd:** 15 min
- [ ] EmailJS account aanmaken
- [ ] Gmail/email service koppelen
- [ ] Template aanmaken met variabelen
- [ ] API keys ophalen
- [ ] Environment variables toevoegen aan `.env.local`

### Fase 2: FeedbackService (basis)
**Geschatte tijd:** 30 min
- [ ] `src/components/feedback/FeedbackService.ts` aanmaken
- [ ] `collectContext()` functie
- [ ] `validateFeedback()` functie
- [ ] `checkRateLimit()` functie
- [ ] `sendFeedback()` functie met EmailJS
- [ ] Type definitions

### Fase 3: FeedbackModal Component
**Geschatte tijd:** 45 min
- [ ] `src/components/feedback/FeedbackModal.tsx` aanmaken
- [ ] Error mode UI (met foutcode preview)
- [ ] Feedback mode UI (met categorie selectie)
- [ ] Form validatie
- [ ] Submit handling
- [ ] Success/error states
- [ ] Rate limit feedback

### Fase 4: Vertalingen
**Geschatte tijd:** 15 min
- [ ] `feedback` sectie toevoegen aan `nl.json`
- [ ] `feedback` sectie toevoegen aan `en.json`

### Fase 5: ErrorBoundary Integratie
**Geschatte tijd:** 30 min
- [ ] State toevoegen voor showFeedback
- [ ] FeedbackModal importeren en renderen
- [ ] "Stuur foutmelding" knop toevoegen
- [ ] Error data doorgeven aan modal
- [ ] Testen met geforceerde error

### Fase 6: StartScreen Integratie
**Geschatte tijd:** 15 min
- [ ] "Hulp nodig?" knop toevoegen aan footer
- [ ] FeedbackModal importeren en renderen
- [ ] State management voor modal open/close

### Fase 7: Testen & Documentatie
**Geschatte tijd:** 30 min
- [ ] Test error mode (forceer crash)
- [ ] Test feedback mode (homepage)
- [ ] Test rate limiting
- [ ] Test email delivery
- [ ] Documentatie in CLAUDE.md
- [ ] Issue #15 afsluiten

**Totaal geschatte tijd:** ~3 uur

---

## 12. Dependencies

### 12.1 NPM Packages

```bash
npm install @emailjs/browser
```

**Package info:**
- Naam: `@emailjs/browser`
- Size: ~15KB
- Geen extra dependencies
- TypeScript support ingebouwd

### 12.2 Geen Andere Dependencies

We hergebruiken:
- Bestaande `Modal` component
- Bestaande `Button` component
- Bestaande i18n setup
- Bestaande Tailwind classes

---

## 13. Toekomstige Uitbreidingen

### 13.1 Settings Menu (Gepland)
Wanneer settings menu wordt geïmplementeerd, voeg toe:
```tsx
<button onClick={() => setShowFeedback(true)}>
  {t('feedback.helpButton')}
</button>
```

### 13.2 Screenshot Attachment (Optioneel)
```typescript
// Canvas screenshot van huidige state
async function captureScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body);
  return canvas.toDataURL('image/png');
}
```

### 13.3 Supabase Logging (Optioneel)
```typescript
// Backup logging naar Supabase
await supabase.from('feedback_logs').insert({
  type: 'error',
  data: errorReport,
  created_at: new Date().toISOString(),
});
```

### 13.4 Analytics Integration (Optioneel)
```typescript
// Track feedback events
analytics.track('feedback_submitted', {
  type: 'error' | 'feedback',
  category: selectedCategory,
});
```

---

## 14. Acceptatie Criteria

- [ ] Bij een crash verschijnt "Stuur foutmelding" knop
- [ ] Foutcode (error message + stack) wordt meegestuurd in email
- [ ] Op homepage staat "Hulp nodig?" in footer
- [ ] Modal toont categorieën (bug, audio, confusion, other)
- [ ] Beschrijving veld met min 10 karakters validatie
- [ ] Email veld is optioneel
- [ ] Rate limiting voorkomt spam (60s cooldown)
- [ ] Success feedback na verzenden
- [ ] Vertalingen werken (NL + EN)
- [ ] Email komt aan in jouw inbox

---

## 15. Open Vragen

1. **Email adres:** Naar welk email adres moeten de meldingen?
   - Suggestie: `feedback@soundscout.app` of persoonlijk email

2. **EmailJS account:** Heb je al een EmailJS account of moet ik er een aanmaken?

3. **Categorie "audio":** Is dit relevant genoeg voor een aparte categorie of kunnen we het bij "bug" houden?

4. **Component stack:** Wil je de volledige React component stack in de email of alleen de error message + stack trace?

---

**Plan gereed voor review.** Wacht op goedkeuring voordat implementatie start.
