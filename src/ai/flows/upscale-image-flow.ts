
'use server';
/**
 * @fileOverview A Genkit flow to upscale an existing image.
 *
 * - upscaleImage - A function that enhances and upscales an image.
 * - UpscaleImageInput - The input type for the upscaleImage function.
 * - UpscaleImageOutput - The return type for the upscaleImage function.
 */

import {ai} from '@/ai/genkit';

import {z} from 'genkit';

const UpscaleImageInputSchema = z.object({
  sourceImageUrl: z
    .string()
    .url()
    .describe(
      'The public URL of the image to be upscaled. This image will be enhanced for details and resolution.'
    ),
});
export type UpscaleImageInput = z.infer<typeof UpscaleImageInputSchema>;

const UpscaleImageOutputSchema = z.object({
  upscaledImageDataUri: z
    .string()
    .describe(
      "The upscaled image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type UpscaleImageOutput = z.infer<typeof UpscaleImageOutputSchema>;

export async function upscaleImage(input: UpscaleImageInput): Promise<UpscaleImageOutput> {
  return upscaleImageFlow(input);
}

const upscaleImagePrompt = ai.definePrompt({
  name: 'upscaleImagePrompt',
  input: {schema: UpscaleImageInputSchema},
  output: {schema: UpscaleImageOutputSchema},
  model: 'googleai/gemini-2.0-flash-exp', // Using image generation capable model
  prompt: `You are an expert AI image processor. Your task is to enhance and upscale the provided image.
Focus on improving clarity, sharpening details, and increasing the overall resolution.
Preserve the original artistic style, content, and composition of the image as much as possible.
The output must be an image.

Image to upscale: {{media url=sourceImageUrl}}
`,
});

const upscaleImageFlow = ai.defineFlow(
  {
    name: 'upscaleImageFlow',
    inputSchema: UpscaleImageInputSchema,
    outputSchema: UpscaleImageOutputSchema,
  },
  async (input) => {
    console.log('[upscaleImageFlow] Starting image upscale for URL:', input.sourceImageUrl);
    try {
      const generationResult = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Or specify a model known for image-to-image tasks if different
        prompt: [ // For image-to-image, structure prompt as an array
          { media: { url: input.sourceImageUrl } },
          { text: "Enhance and upscale this image, focusing on crisp details and a higher resolution. Preserve the original artistic style and content." }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Important for image generation models
        },
      });
      
      const media = generationResult.media;

      if (!media || !media.url) {
        console.error('[upscaleImageFlow] Image upscaling failed: media or media.url is missing in the AI response.', generationResult);
        const aiErrorDetails = generationResult.text ?? 'No specific error message from AI.';
        throw new Error(`AI image upscaling failed to produce a valid media URL. AI reason: ${aiErrorDetails}`);
      }

      console.log('[upscaleImageFlow] Image upscaled successfully.');
      return {upscaledImageDataUri: media.url};

    } catch (error: any) {
      console.error('[upscaleImageFlow] Error during image upscaling for URL', input.sourceImageUrl, ':', error.message, error.stack);
      throw error;
    }
  }
);
