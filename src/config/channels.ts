import type { Env } from './env.js';

export type ChannelRoute = {
  key: string;
  channelId: string;
  description: string;
};

const fallbackRoutes: ChannelRoute[] = [
  {
    key: 'uncategorized',
    channelId: '',
    description: 'Fallback when no configured channel clearly fits.',
  },
];

function isChannelRoute(value: unknown): value is ChannelRoute {
  if (!value || typeof value !== 'object') return false;

  const route = value as Partial<ChannelRoute>;

  return (
    typeof route.key === 'string' &&
    route.key.trim().length > 0 &&
    typeof route.channelId === 'string' &&
    route.channelId.trim().length > 0 &&
    typeof route.description === 'string' &&
    route.description.trim().length > 0
  );
}

export function getChannelRoutes(env: Env): ChannelRoute[] {
  if (!env.channelMapJson) return fallbackRoutes;

  let parsed: unknown;

  try {
    parsed = JSON.parse(env.channelMapJson);
  } catch {
    return fallbackRoutes;
  }

  if (!Array.isArray(parsed)) return fallbackRoutes;

  const clean = parsed
    .filter(isChannelRoute)
    .map((route) => ({
      key: route.key.trim(),
      channelId: route.channelId.trim(),
      description: route.description.trim(),
    }));

  if (clean.length === 0) return fallbackRoutes;

  if (!clean.some((route) => route.key === 'uncategorized')) {
    clean.push({
      key: 'uncategorized',
      channelId: clean[0]?.channelId ?? '',
      description: 'Fallback when no configured channel clearly fits.',
    });
  }

  return clean;
}

export function findChannelRoute(routes: ChannelRoute[], key: string): ChannelRoute | null {
  return routes.find((route) => route.key === key) ?? routes.find((route) => route.key === 'uncategorized') ?? null;
}
