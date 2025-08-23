
'use server';
/**
 * @fileOverview A Genkit flow to generate a funny, kid-friendly username.
 *
 * - generateFunnyName - A function that generates a funny username.
 * - GenerateFunnyNameInput - The input type for the generateFunnyName function.
 * - GenerateFunnyNameOutput - The return type for the generateFunnyName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFunnyNameInputSchema = z.object({
  userId: z.string().describe('The unique ID of the user requesting the name. This can be used for context or logging, but should not be directly part of the generated name.'),
});
export type GenerateFunnyNameInput = z.infer<typeof GenerateFunnyNameInputSchema>;

const GenerateFunnyNameOutputSchema = z.object({
  funnyName: z.string().describe("A short, funny, kid-friendly, and unique-sounding username or nickname, typically 2-3 words. Examples: Captain SquigglePants, Professor Doodlebug, Sir Reginald Scribblesworth."),
});
export type GenerateFunnyNameOutput = z.infer<typeof GenerateFunnyNameOutputSchema>;

export async function generateFunnyName(input: GenerateFunnyNameInput): Promise<GenerateFunnyNameOutput> {
  return generateFunnyNameFlow(input);
}

const generateFunnyNamePrompt = ai.definePrompt({
  name: 'generateFunnyNamePrompt',
  input: {schema: GenerateFunnyNameInputSchema},
  output: {schema: GenerateFunnyNameOutputSchema},
  prompt: `You are a creative naming bot for a children's app called "Squiggles".
Your task is to generate a single, short, funny, kid-friendly, and unique-sounding username or nickname.
It should sound playful and imaginative. The name should be G-rated and suitable for all children.
The generated name should be concise, ideally two to three words.

Consider themes like: doodles, squiggles, art, imagination, fun characters, silly animals, space, magic.

Here are some examples of the style we're looking for:
- Captain SquigglePants
- Professor Doodlebug
- Sir Reginald Scribblesworth III
- Baron Von Wiggles
- Lady Lala Loop
- Commander Crayon
- Sparkle Scribbler
- Giggles McWiggle
- Zoomer Doodle
- Cosmic Painter

The user ID is {{{userId}}} - you don't need to use this in the name, it's just for context.

Generate one funny name.
`,
  // Using a capable model for creative generation.
  // The default model 'gemini-2.0-flash' is also fine.
  // model: 'googleai/gemini-1.5-flash-latest', 
});

const generateFunnyNameFlow = ai.defineFlow(
  {
    name: 'generateFunnyNameFlow',
    inputSchema: GenerateFunnyNameInputSchema,
    outputSchema: GenerateFunnyNameOutputSchema,
  },
  async input => {
    console.log('[generateFunnyNameFlow] Starting name generation for userID:', input.userId);
    try {
      const {output} = await generateFunnyNamePrompt(input);
      if (!output || !output.funnyName) {
        console.error('[generateFunnyNameFlow] Name generation prompt returned no output or empty name.');
        // Fallback name
        return { funnyName: `Squiggler${Math.floor(Math.random() * 1000)}` };
      }
      console.log('[generateFunnyNameFlow] Generated name:', output.funnyName);
      return output;
    } catch (error: any) {
      console.error('[generateFunnyNameFlow] Error during name generation:', error);
      // Fallback name in case of error
      return { funnyName: `DoodleFriend${Math.floor(Math.random() * 1000)}` };
    }
  }
);
