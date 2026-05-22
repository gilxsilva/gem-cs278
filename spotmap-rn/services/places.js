/**
 * services/places.js — place search abstraction
 *
 * Active now:  Nominatim (OpenStreetMap) — free, no API key required.
 *              Returns real lat/lng for any location in the world.
 *
 * Ready to activate: Google Places API.
 *   When you're ready to switch:
 *   1. Go to console.cloud.google.com → enable "Places API"
 *   2. In app.json replace both:
 *        ios.config.googleMapsApiKey        → your real iOS key
 *        android.config.googleMaps.apiKey   → your real Android key
 *   3. Paste the same key as GOOGLE_PLACES_KEY below
 *   4. Comment out the Nominatim export and uncomment the Google block
 *
 * Consumer: screens/AddPin.js PlacePicker component
 * Returns:  PlaceResult[] — normalized shape regardless of source
 */

// ─── Shared result shape ──────────────────────────────────────────────────────
// {
//   source:     'nominatim' | 'google'
//   externalId: string                    ← OSM place_id or Google place_id
//   name:       string                    ← short human name  ("Coupa Café")
//   address:    string                    ← formatted address
//   city:       string | null
//   state:      string | null
//   latitude:   number
//   longitude:  number
// }

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION A — Google Places  (uncomment when API key is configured)
// ═══════════════════════════════════════════════════════════════════════════════
//
// const GOOGLE_PLACES_KEY = 'YOUR_KEY_HERE';
//
// export async function searchPlaces(query) {
//   if (!query || query.trim().length < 2) return [];
//   try {
//     const acRes = await fetch(
//       'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
//         `?input=${encodeURIComponent(query.trim())}` +
//         `&types=establishment%7Cgeocode&key=${GOOGLE_PLACES_KEY}`,
//       { headers: { Accept: 'application/json' } },
//     );
//     const acJson = await acRes.json();
//     const predictions = acJson.predictions ?? [];
//     // Autocomplete doesn't include lat/lng — fetch Place Details for each
//     const results = await Promise.all(
//       predictions.slice(0, 5).map(p => _googleDetails(p.place_id)),
//     );
//     return results.filter(Boolean);
//   } catch (e) {
//     console.warn('[places] Google autocomplete failed:', e.message);
//     return [];
//   }
// }
//
// async function _googleDetails(placeId) {
//   try {
//     const res = await fetch(
//       'https://maps.googleapis.com/maps/api/place/details/json' +
//         `?place_id=${placeId}` +
//         '&fields=name,formatted_address,geometry,address_components' +
//         `&key=${GOOGLE_PLACES_KEY}`,
//       { headers: { Accept: 'application/json' } },
//     );
//     const json = await res.json();
//     const r = json.result;
//     if (!r?.geometry) return null;
//     const get = type =>
//       r.address_components?.find(c => c.types.includes(type));
//     return {
//       source:     'google',
//       externalId: placeId,
//       name:       r.name,
//       address:    r.formatted_address,
//       city:       get('locality')?.long_name ?? null,
//       state:      get('administrative_area_level_1')?.short_name ?? null,
//       latitude:   r.geometry.location.lat,
//       longitude:  r.geometry.location.lng,
//     };
//   } catch { return null; }
// }

// ═══════════════════════════════════════════════════════════════════════════════
// OPTION B — Nominatim / OpenStreetMap  (active)
// ═══════════════════════════════════════════════════════════════════════════════

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Nominatim usage policy: max 1 req/s, must send a User-Agent.
const UA = 'gem-spotmap/1.0';

/**
 * Format a Nominatim display_name into a concise, readable address.
 * Strips postal codes, "United States", and caps at 4 parts.
 */
export function fmtDisplayName(displayName = '') {
  const SKIP = new Set(['United States', 'United Kingdom', 'Canada', 'Australia']);
  return displayName
    .split(', ')
    .filter(p => !/^\d{4,}$/.test(p) && !SKIP.has(p))
    .slice(0, 4)
    .join(', ');
}

/** Pick the best short name from a Nominatim result. */
function _extractName(item) {
  const a = item.address ?? {};
  // Prefer a named POI; fall back to road or first display_name segment
  return (
    a.amenity  || a.building || a.tourism ||
    a.leisure  || a.shop     || a.office  ||
    a.road     || item.display_name.split(', ')[0]
  );
}

/**
 * Search for real-world places via Nominatim.
 * @param {string} query   User-typed search string
 * @returns {Promise<PlaceResult[]>}
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url =
      `${NOMINATIM}?q=${encodeURIComponent(query.trim())}` +
      '&format=json&limit=5&addressdetails=1';
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter(item => item.lat && item.lon)
      .map(item => ({
        source:     'nominatim',
        externalId: String(item.place_id),
        name:       _extractName(item),
        address:    fmtDisplayName(item.display_name),
        city:       item.address?.city  || item.address?.town  ||
                    item.address?.village || null,
        state:      item.address?.state || null,
        latitude:   parseFloat(item.lat),
        longitude:  parseFloat(item.lon),
      }));
  } catch (e) {
    console.warn('[places] Nominatim search failed:', e.message);
    return [];
  }
}

/**
 * Geocode a free-text address string.
 * Used when a user manually types an address without picking a suggestion.
 * Returns the best match, or null if nothing is found.
 * @param {string} address
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) return null;
  const results = await searchPlaces(address);
  if (results.length === 0) return null;
  return { latitude: results[0].latitude, longitude: results[0].longitude };
}
