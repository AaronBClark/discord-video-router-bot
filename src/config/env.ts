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
  debugVideoRouter: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function resolveDatabasePath(): string {
  const explicit = optionalEnv('DATABASE_PATH');
  if (explicit) return explicit;

  const railwayVolume = optionalEnv('RAILWAY_VOLUME_MOUNT_PATH');
  if (railwayVolume) return `${railwayVolume}/video-router.sqlite`;

  return resolve(process.cwd(), 'data/video-router.sqlite');
}

function optionalBooleanEnv(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function resolvePort(): number {
  const value = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }
  return value;
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
    geminiModel: optionalEnv('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite',
    databasePath,
    port: resolvePort(),
    channelMapJson: optionalEnv('CHANNEL_MAP_JSON'),
    debugVideoRouter: optionalBooleanEnv('DEBUG_VIDEO_ROUTER'),
  };
}
