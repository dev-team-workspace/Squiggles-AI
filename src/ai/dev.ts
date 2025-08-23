
import { config } from 'dotenv';
config(); // Load environment variables from .env file

// Log to verify if GOOGLE_API_KEY is loaded
const apiKeyFromEnv = process.env.GOOGLE_API_KEY;
if (apiKeyFromEnv) {
  console.log('[src/ai/dev.ts] GOOGLE_API_KEY loaded from .env:', apiKeyFromEnv.substring(0, 10) + '...'); // Log a portion for verification
} else {
  console.error('[src/ai/dev.ts] ERROR: GOOGLE_API_KEY not found in process.env. Make sure it is set in your .env file.');
}

import '@/ai/flows/content-moderation.ts'; // Keep for text, if used elsewhere
import '@/ai/flows/moderate-image-safety-flow.ts'; // New image moderation flow
import '@/ai/flows/transform-drawing.ts';
import '@/ai/flows/hello-flow.ts';
import '@/ai/flows/generate-funny-name-flow.ts';
import '@/ai/flows/generate-drawing-title-flow.ts';
import '@/ai/flows/generate-doodle-avatar-flow.ts';
import '@/ai/flows/upscale-image-flow.ts'; // Import the new upscale flow
