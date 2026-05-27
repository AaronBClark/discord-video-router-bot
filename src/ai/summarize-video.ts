import { GoogleGenAI, Type } from '@google/genai';
import type { Env } from '../config/env.js';
import { findChannelRoute } from '../config/channels.js';
import type { ChannelRoute } from '../config/channels.js';
import { buildVideoAnalysisPrompt } from './prompts.js';
import type { VideoAnalysis } from './schemas.js';
import { logger } from '../utils/logger.js';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title_guess: { type: Type.STRING, nullable: true },
    short_summary: { type: Type.STRING },
    detailed_summary: { type: Type.STRING },
    key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
    topics: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommended_channel_key: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    reason: { type: Type.STRING },
    content_warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'title_guess',
    'short_summary',
    'detailed_summary',
    'key_points',
    'topics',
    'recommended_channel_key',
    'confidence',
    'reason',
    'content_warnings',
  ],
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function sanitizeAnalysis(parsed: Partial<VideoAnalysis>, routes: ChannelRoute[]): VideoAnalysis {
  const requestedKey = typeof parsed.recommended_channel_key === 'string' ? parsed.recommended_channel_key : '';
  const resolvedRoute = findChannelRoute(routes, requestedKey);

  if (requestedKey && resolvedRoute && resolvedRoute.key !== requestedKey.trim().toLowerCase()) {
    logger.warn(`Gemini returned unknown route "${requestedKey}"; using "${resolvedRoute.key}" instead.`);
  }

  return {
    title_guess: typeof parsed.title_guess === 'string' && parsed.title_guess.trim() ? parsed.title_guess.trim() : null,
    short_summary: typeof parsed.short_summary === 'string' ? parsed.short_summary.trim() : 'No summary returned.',
    detailed_summary: typeof parsed.detailed_summary === 'string' ? parsed.detailed_summary.trim() : 'No detailed summary returned.',
    key_points: stringArray(parsed.key_points),
    topics: stringArray(parsed.topics),
    recommended_channel_key: resolvedRoute?.key ?? requestedKey.trim().toLowerCase() ?? 'uncategorized',
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : 'No reason returned.',
    content_warnings: stringArray(parsed.content_warnings),
  };
}

export async function analyzeVideoTranscript(
  env: Env,
  routes: ChannelRoute[],
  transcript: string,
): Promise<VideoAnalysis> {
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const prompt = buildVideoAnalysisPrompt(routes, transcript.slice(0, 180_000));

  logger.info(`Sending transcript to Gemini (${transcript.length} chars, ${routes.length} routes).`);

  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  const parsed = JSON.parse(text) as Partial<VideoAnalysis>;
  return sanitizeAnalysis(parsed, routes);
}
