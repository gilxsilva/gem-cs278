import { Share, Alert } from 'react-native';

/**
 * Builds a share message for a gem.
 *
 * @param {object} gem
 *   title        string  — gem title
 *   locationName string  — "Place Name, City" or address
 *   note         string  — caption / user notes
 *   authorName   string  — display name of the person who posted
 *   category     string  — category id (optional, not included in message)
 *   id           string  — gem uuid (used for shareUrl if provided)
 *
 * @param {object} [options]
 *   shareUrl     string  — optional deep/web link to append
 *                          e.g. "gem://gem/<id>" or "https://gem.app/gem/<id>"
 *                          To enable: pass Linking.createURL(`/gem/${gem.id}`)
 *                          Leave undefined until a public URL or Linking config exists.
 */
export function buildGemShareMessage(gem, options = {}) {
  const { shareUrl } = options;

  const lines = [];

  lines.push('Check out this gem on Gem ✨');
  lines.push('');

  if (gem.title) lines.push(gem.title);
  if (gem.locationName) lines.push(gem.locationName);

  if (gem.note?.trim()) {
    lines.push('');
    lines.push(gem.note.trim());
  }

  if (gem.authorName) {
    lines.push('');
    lines.push(`Found by ${gem.authorName}`);
  }

  if (shareUrl) {
    lines.push('');
    lines.push(shareUrl);
  }

  lines.push('');
  lines.push('Gem helps you discover meaningful places saved by real people.');

  return lines.join('\n');
}

/**
 * Opens the native share sheet for a gem.
 * Fails silently on cancel; shows a friendly alert on unexpected error.
 */
export async function shareGem(gem) {
  try {
    const message = buildGemShareMessage(gem);
    const result = await Share.share({ message, title: gem.title ?? 'Gem' });
    // result.action is 'sharedAction' or 'dismissedAction' — no alert needed either way
    return result;
  } catch (err) {
    Alert.alert("Couldn't share", "Couldn't open sharing right now. Please try again.");
  }
}
