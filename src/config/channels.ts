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

export function getChannelRoutes(env: Env): ChannelRoute[] {
  if (!env.channelMapJson) return fallbackRoutes;

  const parsed = JSON.parse(env.channelMapJson) as ChannelRoute[];
  const clean = parsed.filter((route) => route.key && route.channelId && route.description);

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
