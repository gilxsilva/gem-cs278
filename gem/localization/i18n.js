import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './translations/en.json';
import es from './translations/es.json';

export const LANGUAGE_STORAGE_KEY = 'gem_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
];

// Custom detector that reads/writes language from AsyncStorage.
// Called once on startup; cacheUserLanguage is called by i18next whenever
// i18n.changeLanguage() is used, so persistence is automatic.
const asyncStorageDetector = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: (callback) => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then(lng => callback(lng ?? 'en'))
      .catch(() => callback('en'));
  },
  cacheUserLanguage: (lng) => {
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng).catch(() => {});
  },
};

i18n
  .use(asyncStorageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
