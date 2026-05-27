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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeRouteKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeChannelId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDescription(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function isChannelRoute(value: unknown): value is ChannelRoute {
  if (!isObject(value)) return false;

  return (
    typeof value.key === 'string' &&
    normalizeRouteKey(value.key).length > 0 &&
    typeof value.channelId === 'string' &&
    value.channelId.trim().length > 0 &&
    typeof value.description === 'string' &&
    value.description.trim().length > 0
  );
}

function routeFromObject(value: unknown): ChannelRoute | null {
  if (!isChannelRoute(value)) return null;

  return {
    key: normalizeRouteKey(value.key),
    channelId: value.channelId.trim(),
    description: value.description.trim(),
  };
}

function routeFromMapEntry(key: string, value: unknown): ChannelRoute | null {
  const normalizedKey = normalizeRouteKey(key);
  if (!normalizedKey) return null;

  if (typeof value === 'string') {
    const channelId = normalizeChannelId(value);
    if (!channelId) return null;

    return {
      key: normalizedKey,
      channelId,
      description: `Videos categorized as ${normalizedKey}.`,
    };
  }

  if (!isObject(value)) return null;

  const channelId = normalizeChannelId(value.channelId ?? value.channel_id ?? value.id);
  if (!channelId) return null;

  return {
    key: normalizedKey,
    channelId,
    description: normalizeDescription(value.description, `Videos categorized as ${normalizedKey}.`),
  };
}

function parseRoutes(channelMapJson: string | null): ChannelRoute[] {
  if (!channelMapJson) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(channelMapJson);
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) {
    return parsed.map(routeFromObject).filter((route): route is ChannelRoute => Boolean(route));
  }

  if (isObject(parsed)) {
    return Object.entries(parsed)
      .map(([key, value]) => routeFromMapEntry(key, value))
      .filter((route): route is ChannelRoute => Boolean(route));
  }

  return [];
}

function dedupeRoutes(routes: ChannelRoute[]): ChannelRoute[] {
  const seen = new Set<string>();
  const clean: ChannelRoute[] = [];

  for (const route of routes) {
    const key = normalizeRouteKey(route.key);
    if (!key || seen.has(key)) continue;

    clean.push({
      key,
      channelId: route.channelId.trim(),
      description: route.description.trim(),
    });
    seen.add(key);
  }

  return clean;
}

export function getChannelRoutes(env: Env): ChannelRoute[] {
  const clean = dedupeRoutes(parseRoutes(env.channelMapJson));

  if (clean.length === 0) return fallbackRoutes;

  if (!clean.some((route) => route.key === 'uncategorized')) {
    const miscRoute = clean.find((route) => route.key === 'misc');

    clean.push({
      key: 'uncategorized',
      channelId: miscRoute?.channelId ?? clean[0]?.channelId ?? '',
      description: 'Fallback when no configured channel clearly fits.',
    });
  }

  return clean;
}

export function getConfiguredChannelRoutes(routes: ChannelRoute[]): ChannelRoute[] {
  return routes.filter((route) => route.channelId.trim().length > 0);
}

export function findChannelRoute(routes: ChannelRoute[], key: string): ChannelRoute | null {
  const normalizedKey = normalizeRouteKey(key);
  const configuredRoutes = getConfiguredChannelRoutes(routes);

  return (
    configuredRoutes.find((route) => normalizeRouteKey(route.key) === normalizedKey) ??
    configuredRoutes.find((route) => route.key === 'uncategorized') ??
    configuredRoutes.find((route) => route.key === 'misc') ??
    configuredRoutes[0] ??
    null
  );
}

export function describeChannelRoutes(routes: ChannelRoute[]): string {
  if (routes.length === 0) return 'No routes loaded.';

  return routes
    .map((route) => `${route.key} -> ${route.channelId ? `<#${route.channelId}>` : '(missing channel id)'}`)
    .join('\n');
}

export function getRouteConfigErrors(routes: ChannelRoute[]): string[] {
  const errors: string[] = [];
  const configuredRoutes = getConfiguredChannelRoutes(routes);

  if (configuredRoutes.length === 0) {
    errors.push('No usable destination routes are configured. CHANNEL_MAP_JSON must include at least one route with a channelId.');
  }

  const seen = new Set<string>();
  for (const route of routes) {
    if (!route.channelId) errors.push(`Route "${route.key}" is missing a channelId.`);
    if (seen.has(route.key)) errors.push(`Route "${route.key}" appears more than once.`);
    seen.add(route.key);
  }

  return errors;
}
