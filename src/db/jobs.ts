import { getDb } from './db.js';

export type JobStatus =
  | 'queued'
  | 'fetching_transcript'
  | 'summarizing'
  | 'pending_approval'
  | 'posted'
  | 'rejected'
  | 'failed';

export type JobRecord = {
  id: number;
  video_id: number;
  source_guild_id: string;
  source_channel_id: string;
  source_message_id: string;
  status: JobStatus;
  error: string | null;
  approval_message_id: string | null;
  posted_channel_id: string | null;
  posted_message_id: string | null;
};

export function createJob(videoId: number, guildId: string, channelId: string, messageId: string): JobRecord {
  const result = getDb().prepare(`
    INSERT INTO jobs (video_id, source_guild_id, source_channel_id, source_message_id, status)
    VALUES (?, ?, ?, ?, 'queued')
  `).run(videoId, guildId, channelId, messageId);

  return getJob(Number(result.lastInsertRowid))!;
}

export function getJob(jobId: number): JobRecord | null {
  return (getDb().prepare(`
    SELECT id, video_id, source_guild_id, source_channel_id, source_message_id, status, error,
      approval_message_id, posted_channel_id, posted_message_id
    FROM jobs
    WHERE id = ?
  `).get(jobId) as JobRecord | undefined) ?? null;
}

export function updateJobStatus(jobId: number, status: JobStatus, error?: string): void {
  getDb().prepare(`
    UPDATE jobs
    SET status = ?, error = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, error ?? null, jobId);
}

export function setApprovalMessage(jobId: number, messageId: string): void {
  getDb().prepare(`
    UPDATE jobs
    SET approval_message_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(messageId, jobId);
}

export function markPosted(jobId: number, channelId: string, messageId: string): void {
  getDb().prepare(`
    UPDATE jobs
    SET status = 'posted',
      posted_channel_id = ?,
      posted_message_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(channelId, messageId, jobId);
}
