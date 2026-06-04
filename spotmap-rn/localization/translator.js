// In-memory cache keyed by `lang\x00text`. Survives language switches within a session.
const cache = new Map();

/**
 * Translate a single string from English to targetLang using the MyMemory free API.
 * Returns the original text on any error so the UI never shows nothing.
 */
export async function translateText(text, targetLang) {
  if (!text?.trim() || targetLang === 'en') return text ?? '';

  const key = `${targetLang}\x00${text}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url =
      `https://api.mymemory.translated.net/get` +
      `?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const res  = await fetch(url);
    const json = await res.json();

    if (json?.responseStatus === 200) {
      let result = json.responseData.translatedText;
      // MyMemory sometimes echoes the URL-encoded query back as the "translation".
      // Decoding fixes that; if the string isn't encoded, decodeURIComponent is a no-op.
      try { result = decodeURIComponent(result); } catch {}
      // Sanity-check: if the result still looks like the encoded input, return the original.
      if (result.includes('%20')) return text;
      cache.set(key, result);
      return result;
    }
  } catch {}

  return text;
}
