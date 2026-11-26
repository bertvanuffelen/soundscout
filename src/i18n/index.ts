import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './locales/nl.json';
import en from './locales/en.json';

// Persist language preference
const LANG_KEY = 'soundscout-lang';

/**
 * Starttaal bij een eerste bezoek: volg de browser (besluit Bert 19-7).
 * Engelse browser → Engelse app; al het andere → Nederlands (de doelgroep is
 * Nederlandstalig, dus NL is de veilige default). Een handmatige keuze wordt
 * opgeslagen en wint altijd — ook als de browser iets anders zegt.
 */
function detectInitialLanguage(): string {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'nl' || saved === 'en') return saved;
  const browserLangs = navigator.languages?.length ? navigator.languages : [navigator.language];
  const prefersEnglish = browserLangs.some((l) => l?.toLowerCase().startsWith('en'));
  return prefersEnglish ? 'en' : 'nl';
}

const savedLang = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'nl',
  interpolation: {
    escapeValue: false,
  },
  // Thema-teksten komen later binnen (i18n.addResources na loadTheme): laat
  // elk onderdeel met useTranslation dan opnieuw tekenen. Zonder dit bleef een
  // geluidsnaam de ruwe sleutel tot er toevallig iets anders opnieuw tekende.
  react: {
    bindI18nStore: 'added',
  },
});

// Sync direct bij het laden: het languageChanged-event vuurt niet bij init, waardoor
// <html lang> anders op de standaardtaal bleef staan in een opgeslagen EN-sessie.
document.documentElement.lang = savedLang;

// Save language preference on change + sync document lang attribute
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_KEY, lng);
  document.documentElement.lang = lng;
});

export default i18n;
