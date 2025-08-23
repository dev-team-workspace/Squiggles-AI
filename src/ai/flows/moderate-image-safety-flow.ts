
'use server';
/**
 * @fileOverview A Genkit flow to moderate an image for child safety.
 *
 * - moderateImage - A function that moderates the provided image.
 * - ModerateImageInput - The input type for the moderateImage function.
 * - ModerateImageOutput - The return type for the moderateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateImageInputSchema = z.object({
  imageUrl: z.string().url().describe('The publicly accessible URL of the image to be moderated.'),
});
export type ModerateImageInput = z.infer<typeof ModerateImageInputSchema>;

const ModerateImageOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the image is safe and appropriate for children.'),
  reason: z.string().optional().describe('The reason why the image is not safe, if applicable.'),
});
export type ModerateImageOutput = z.infer<typeof ModerateImageOutputSchema>;

export async function moderateImage(input: ModerateImageInput): Promise<ModerateImageOutput> {
  return moderateImageSafetyFlow(input);
}

const moderationPrompt = ai.definePrompt({
  name: 'moderateImageSafetyPrompt',
  input: {schema: ModerateImageInputSchema},
  output: {schema: ModerateImageOutputSchema},
  // Using gemini-pro-vision explicitly as it's known for image understanding.
  // The default model 'gemini-2.0-flash' might also work if it supports multimodal prompts with media URLs.
  // If 'googleai/gemini-2.0-flash-exp' is used for generation, 'googleai/gemini-pro-vision' is a good choice for analysis.
  model: 'googleai/gemini-pro-vision', 
  prompt: `You are an expert content safety moderator for an application targeted at children.
Your role is to ensure that the provided image is safe and appropriate for children.
Consider aspects like: no violence, no scary elements, no inappropriate content, no hate symbols, etc.
The image should be generally positive or neutral and suitable for a young audience.

Image to moderate: {{media url=imageUrl}}

Respond with whether the image is safe or not.
Set isSafe to true if the image is safe, and false if it is not.
If isSafe is false, provide a brief, user-friendly reason in the reason field (e.g., "Image may be too scary for children.").
`,
});

const moderateImageSafetyFlow = ai.defineFlow(
  {
    name: 'moderateImageSafetyFlow',
    inputSchema: ModerateImageInputSchema,
    outputSchema: ModerateImageOutputSchema,
  },
  async input => {
    console.log('[moderateImageSafetyFlow] Starting moderation for image URL:', input.imageUrl);
    try {
      const {output} = await moderationPrompt(input);
      console.log('[moderateImageSafetyFlow] Moderation result:', output);
      if (!output) {
        console.error('[moderateImageSafetyFlow] Moderation prompt returned no output.');
        return { isSafe: false, reason: 'Moderation check failed to produce a result.' };
      }
      return output;
    } catch (error: any) {
      console.error('[moderateImageSafetyFlow] Error during image moderation:', error);
      return { 
        isSafe: false, 
        reason: `Moderation check encountered an error: ${error.message || 'Unknown error'}` 
      };
    }
  }
);
