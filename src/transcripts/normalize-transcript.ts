import type { TranscriptSegment } from './types.js';

const entityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

export function decodeBasicHtmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot);|&#39;/g, (entity) => entityMap[entity] ?? entity);
}

export function cleanTranscriptText(value: string): string {
  return decodeBasicHtmlEntities(value)
    .replace(/\[(Music|Applause|Laughter|Silence)\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function segmentsToPlainText(segments: TranscriptSegment[]): string {
  return cleanTranscriptText(segments.map((segment) => segment.text).join(' '));
}
