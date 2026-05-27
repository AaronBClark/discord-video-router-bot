import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { getEnv } from '../config/env.js';

const env = getEnv();
const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

const response = await ai.models.generateContent({
  model: env.geminiModel,
  contents: 'Return JSON describing this test. Use status="ok" and a one sentence message.',
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        message: { type: Type.STRING },
      },
      required: ['status', 'message'],
    },
  },
});

if (!response.text) {
  throw new Error('Gemini returned an empty response.');
}

console.log(response.text);
