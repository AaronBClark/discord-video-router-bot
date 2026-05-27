import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type Env = {
  discordToken: string;
  approvalChannelId: string;
  sourceChannelIds: Set<string>;
  geminiApiKey: string;
  geminiModel: string;
  databasePath: string;
  port: number;
  channelMapJson: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveDatabasePath(): string {
  const explicit = process.env.DATABASE_PATH?.trim();
  if (explicit) return explicit;

  const railwayVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (railwayVolume) return `${railwayVolume}/video-router.sqlite`;

  return resolve(process.cwd(), 'data/video-router.sqlite');
}

export function getEnv(): Env {
  const databasePath = resolveDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  const sourceChannelIds = new Set(
    (process.env.SOURCE_CHANNEL_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );

  return {
    discordToken: requireEnv('DISCORD_TOKEN'),
    approvalChannelId: requireEnv('APPROVAL_CHANNEL_ID'),
    sourceChannelIds,
    geminiApiKey: requireEnv('GEMINI_API_KEY'),
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite',
    databasePath,
    port: Number(process.env.PORT ?? 3000),
    channelMapJson: process.env.CHANNEL_MAP_JSON?.trim() || null,
  };
}
