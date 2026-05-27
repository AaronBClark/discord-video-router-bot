import { GoogleGenAI, Type } from '@google/genai';
import type { Env } from '../config/env.js';
import type { ChannelRoute } from '../config/channels.js';
import { buildVideoAnalysisPrompt } from './prompts.js';
import type { VideoAnalysis } from './schemas.js';

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

export async function analyzeVideoTranscript(
  env: Env,
  routes: ChannelRoute[],
  transcript: string,
): Promise<VideoAnalysis> {
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const prompt = buildVideoAnalysisPrompt(routes, transcript.slice(0, 180_000));

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

  const parsed = JSON.parse(text) as VideoAnalysis;

  return {
    ...parsed,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
  };
}
