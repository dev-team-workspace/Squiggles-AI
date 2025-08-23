
'use server';
/**
 * @fileOverview A Genkit flow to generate a fun, kid-friendly title for a drawing.
 *
 * - generateDrawingTitle - A function that generates a title for the provided image.
 * - GenerateDrawingTitleInput - The input type for the generateDrawingTitle function.
 * - GenerateDrawingTitleOutput - The return type for the generateDrawingTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDrawingTitleInputSchema = z.object({
  transformedImageDataUri: z
    .string()
    .describe(
      "The AI-transformed image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateDrawingTitleInput = z.infer<typeof GenerateDrawingTitleInputSchema>;

const GenerateDrawingTitleOutputSchema = z.object({
  title: z.string().describe("A short, fun, imaginative, and kid-friendly title for the drawing, typically 2-5 words. Examples: 'Sparkly Robot Friend', 'Rainbow Unicorn Adventure', 'Sleepy Blue Dragon', 'My Space Rocket to Mars'."),
});
export type GenerateDrawingTitleOutput = z.infer<typeof GenerateDrawingTitleOutputSchema>;

export async function generateDrawingTitle(input: GenerateDrawingTitleInput): Promise<GenerateDrawingTitleOutput> {
  return generateDrawingTitleFlow(input);
}

const creativeFallbackTitles = [
  "The Doodlist's Delight",
  "Scribble Masterpiece Unveiled!",
  "Behold! The Ineffable Squiggle",
  "From Sketchbook to Stardom",
  "A Modern Art Marvel (Probably)",
  "The Critically Acclaimed Doodle",
  "Future Museum Piece",
  "Artistic Genius at Play",
  "Captured Imagination",
  "Canvas Conqueror",
  "Color Outside the Lines, Then THIS!",
  "My Brain's Best Work Today",
  "This Belongs in the Louvre (of Doodles)",
  "Picasso Who?",
  "The Next Big Thing in Squiggle Art",
  "Certified Fresh Creation",
  "Doodle Dream Realized",
  "Brushstroke Brilliance",
  "The Unforgettable Blob",
  "Definitely Not AI-Generated... Oh Wait!",
];

const generateTitlePrompt = ai.definePrompt({
  name: 'generateDrawingTitlePrompt',
  input: {schema: GenerateDrawingTitleInputSchema},
  output: {schema: GenerateDrawingTitleOutputSchema},
  model: 'googleai/gemini-1.5-flash', // Using vision model for image analysis
  prompt: `You are an expert at creating fun and imaginative titles for children's artwork.
Look at the provided image, which is an AI-transformed version of a child's drawing.
Your task is to generate a single, short, fun, kid-friendly, and imaginative title for this artwork.
The title should be G-rated and suitable for all children.
The title should be concise, ideally two to five words.

Examples of good titles:
- Sparkly Robot Friend
- Rainbow Unicorn Adventure
- Sleepy Blue Dragon
- My Space Rocket to Mars
- The Wobbly Monster Dance
- Three Happy Suns
- Speedy Purple Car

Analyze the main subject, colors, and overall feeling of the image.
Based on your analysis, generate one title.

Image to analyze: {{media url=transformedImageDataUri}}
`,
});

const generateDrawingTitleFlow = ai.defineFlow(
  {
    name: 'generateDrawingTitleFlow',
    inputSchema: GenerateDrawingTitleInputSchema,
    outputSchema: GenerateDrawingTitleOutputSchema,
  },
  async input => {
    console.log('[generateDrawingTitleFlow] Starting title generation for image.');
    try {
      const {output} = await generateTitlePrompt(input);
      if (!output || !output.title || output.title.trim() === "") {
        console.warn('[generateDrawingTitleFlow] Title generation prompt returned no output or empty title. Using a creative fallback.');
        const fallbackTitle = creativeFallbackTitles[Math.floor(Math.random() * creativeFallbackTitles.length)];
        return { title: fallbackTitle };
      }
      console.log('[generateDrawingTitleFlow] Generated title:', output.title);
      return output;
    } catch (error: any) {
      console.error('[generateDrawingTitleFlow] Error during title generation:', error);
      const fallbackTitle = creativeFallbackTitles[Math.floor(Math.random() * creativeFallbackTitles.length)];
      console.warn(`[generateDrawingTitleFlow] Using creative fallback title due to error: "${fallbackTitle}"`);
      return { title: fallbackTitle };
    }
  }
);

