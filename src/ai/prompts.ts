import type { ChannelRoute } from '../config/channels.js';

export function buildVideoAnalysisPrompt(routes: ChannelRoute[], transcript: string): string {
  const routeText = routes
    .map((route) => `- ${route.key}: ${route.description}`)
    .join('\n');
  const routeKeys = routes.map((route) => route.key).join(', ');

  return `You are sorting a YouTube video into a Discord server.

Use only the transcript. Do not invent facts not supported by the transcript.

Available destination channels:
${routeText}

Allowed recommended_channel_key values:
${routeKeys}

Return concise, useful JSON. Choose exactly one recommended_channel_key from the allowed values above. Do not invent a new channel key. If no channel fits cleanly, choose "uncategorized" when it is available.

Transcript:
${transcript}`;
}
