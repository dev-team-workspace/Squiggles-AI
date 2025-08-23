import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error('[genkit.ts] ❌ GOOGLE_API_KEY is missing in environment variables.');
}

console.log('[genkit.ts] ✅ Initializing Genkit with googleAI plugin...');

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-2.0-flash',
});

