import type { ChannelRoute } from '../config/channels.js';

export function buildVideoAnalysisPrompt(routes: ChannelRoute[], transcript: string): string {
  const routeText = routes
    .map((route) => `- ${route.key}: ${route.description}`)
    .join('\n');

  return `You are sorting a YouTube video into a Discord server.

Use only the transcript. Do not invent facts not supported by the transcript.

Available destination channels:
${routeText}

Return concise, useful JSON. Choose exactly one recommended_channel_key from the available destination channels.

Transcript:
${transcript}`;
}
