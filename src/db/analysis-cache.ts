import { getDb } from './db.js';
import type { VideoAnalysis } from '../ai/schemas.js';

export function getCachedAnalysis(videoId: number, model: string): VideoAnalysis | null {
  const row = getDb().prepare(`
    SELECT analysis_json
    FROM analyses
    WHERE video_id = ? AND model = ?
  `).get(videoId, model) as { analysis_json: string } | undefined;

  return row ? (JSON.parse(row.analysis_json) as VideoAnalysis) : null;
}

export function saveAnalysis(videoId: number, model: string, analysis: VideoAnalysis): void {
  getDb().prepare(`
    INSERT INTO analyses (video_id, model, analysis_json)
    VALUES (?, ?, ?)
    ON CONFLICT(video_id, model)
    DO UPDATE SET analysis_json = excluded.analysis_json
  `).run(videoId, model, JSON.stringify(analysis));
}
