import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './locales/nl.json';
import en from './locales/en.json';

// Persist language preference
const LANG_KEY = 'soundscout-lang';
const savedLang = localStorage.getItem(LANG_KEY) || 'nl';

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
});

// Save language preference on change
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_KEY, lng);
});

export default i18n;
