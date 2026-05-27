import { parseYouTubeUrl, type YouTubeLink } from './youtube.js';

const URL_REGEX = /https?:\/\/[^\s<>()]+/gi;

export function extractYouTubeLinks(text: string): YouTubeLink[] {
  const matches = text.match(URL_REGEX) ?? [];
  const byVideoId = new Map<string, YouTubeLink>();

  for (const match of matches) {
    const cleaned = match.replace(/[),.]+$/, '');
    const parsed = parseYouTubeUrl(cleaned);
    if (parsed) byVideoId.set(parsed.videoId, parsed);
  }

  return [...byVideoId.values()];
}
