// This file uses server-side code.
'use server';

/**
 * @fileOverview Ensures that AI-generated content adheres to brand guidelines.
 *
 * - moderateContent - A function that moderates the content.
 * - ModerateContentInput - The input type for the moderateContent function.
 * - ModerateContentOutput - The return type for the moderateContent function.
 */

import {ai} from '@/ai/genkit';

import {z} from 'genkit';

const ModerateContentInputSchema = z.object({
  content: z.string().describe('The content to be moderated.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the content is safe and adheres to brand guidelines.'),
  reason: z.string().optional().describe('The reason why the content is not safe, if applicable.'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const moderationPrompt = ai.definePrompt({
  name: 'moderationPrompt',
  input: {schema: ModerateContentInputSchema},
  output: {schema: ModerateContentOutputSchema},
  prompt: `You are a content moderator for an application targeted at children.

    Your role is to ensure that the provided content adheres to brand guidelines and is safe and appropriate for children.

    Content to moderate: {{{content}}}

    Respond with whether the content is safe or not, and if not, provide a reason.
    Set isSafe to true if the content is safe, and false if it is not.
    If isSafe is false, provide a reason in the reason field.
    `,
});

const moderateContentFlow = ai.defineFlow(
  {
    name: 'moderateContentFlow',
    inputSchema: ModerateContentInputSchema,
    outputSchema: ModerateContentOutputSchema,
  },
  async input => {
    const {output} = await moderationPrompt(input);
    return output!;
  }
);
