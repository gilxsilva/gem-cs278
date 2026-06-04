import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from './translator';

/**
 * Translates a piece of user-generated text into the app's current language.
 * - Returns the original text immediately (no flash of empty content).
 * - Swaps in the translation once the API responds.
 * - Re-translates automatically when the language changes.
 * - Skips the API call if the language is English.
 */
export function useAutoTranslate(text) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [displayed, setDisplayed] = useState(text ?? '');
  const latestKey = useRef(`${lang}\x00${text}`);

  useEffect(() => {
    const currentKey = `${lang}\x00${text}`;
    latestKey.current = currentKey;

    // Always show the original immediately so there's no blank flash
    setDisplayed(text ?? '');

    if (!text?.trim() || lang === 'en') return;

    let cancelled = false;
    translateText(text, lang).then(result => {
      if (!cancelled && latestKey.current === currentKey) {
        setDisplayed(result);
      }
    });

    return () => { cancelled = true; };
  }, [text, lang]);

  return displayed;
}
