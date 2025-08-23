
'use server';
/**
 * @fileOverview A Genkit flow to generate a unique, kid-friendly doodle-style avatar.
 *
 * - generateDoodleAvatar - A function that generates an avatar image.
 * - GenerateDoodleAvatarInput - The input type for the generateDoodleAvatar function.
 * - GenerateDoodleAvatarOutput - The return type for the generateDoodleAvatar function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema (currently just userId for context/logging, could be expanded later)
const GenerateDoodleAvatarInputSchema = z.object({
  userId: z.string().describe('The unique ID of the user requesting the avatar. This can be used for context or logging.'),
});
export type GenerateDoodleAvatarInput = z.infer<typeof GenerateDoodleAvatarInputSchema>;

// Output schema: the generated image as a data URI
const GenerateDoodleAvatarOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe("The generated avatar image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateDoodleAvatarOutput = z.infer<typeof GenerateDoodleAvatarOutputSchema>;

export async function generateDoodleAvatar(input: GenerateDoodleAvatarInput): Promise<GenerateDoodleAvatarOutput> {
  return generateDoodleAvatarFlow(input);
}

const generateAvatarPrompt = `You are an AI artist specializing in creating unique, kid-friendly, and imaginative avatars.
The avatar should look like a simple face doodle or scribble that has been transformed into colorful, playful art.
Ensure it's suitable as a profile picture: it should be focused on a single character/face, be visually appealing, and generally square or circular in composition.
The style should be fun and lighthearted. Avoid anything scary or overly complex.
The output must be an image. Generate a single image.
User ID for context (do not include in image): {{{userId}}}`;

const generateDoodleAvatarFlow = ai.defineFlow(
  {
    name: 'generateDoodleAvatarFlow',
    inputSchema: GenerateDoodleAvatarInputSchema,
    outputSchema: GenerateDoodleAvatarOutputSchema,
  },
  async (input) => {
    console.log('[generateDoodleAvatarFlow] Starting avatar generation for userID:', input.userId);
    try {
      const generationResult = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Using experimental model for image generation
        prompt: generateAvatarPrompt.replace('{{{userId}}}', input.userId), // Simple replacement for basic templating
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Important for image generation models
        },
      });

      const media = generationResult.media;

      if (!media || !media.url) {
        console.error('[generateDoodleAvatarFlow] Image generation failed: media or media.url is missing in the AI response.', generationResult);
        const aiErrorDetails = generationResult.candidates?.[0]?.finishReasonMessage || 'No specific error message from AI.';
        throw new Error(`AI avatar generation failed to produce a valid media URL. AI reason: ${aiErrorDetails}`);
      }

      console.log('[generateDoodleAvatarFlow] Avatar generated successfully for userID:', input.userId);
      return {imageDataUri: media.url};

    } catch (error: any) {
      console.error('[generateDoodleAvatarFlow] Error during avatar generation for userID', input.userId, ':', error.message, error.stack);
      throw error; 
    }
  }
);
