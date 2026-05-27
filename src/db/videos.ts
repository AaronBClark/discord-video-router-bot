import { getDb } from './db.js';

export type VideoRecord = {
  id: number;
  platform: string;
  platform_video_id: string;
  original_url: string;
};

export function upsertVideo(platform: string, platformVideoId: string, originalUrl: string): VideoRecord {
  const db = getDb();

  db.prepare(`
    INSERT INTO videos (platform, platform_video_id, original_url)
    VALUES (?, ?, ?)
    ON CONFLICT(platform, platform_video_id)
    DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP
  `).run(platform, platformVideoId, originalUrl);

  return db.prepare(`
    SELECT id, platform, platform_video_id, original_url
    FROM videos
    WHERE platform = ? AND platform_video_id = ?
  `).get(platform, platformVideoId) as VideoRecord;
}
