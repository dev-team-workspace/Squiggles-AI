'use server';
/**
 * @fileOverview A simple example Genkit flow.
 *
 * - helloFlow - A flow that generates a greeting.
 * This file also demonstrates how to invoke the flow directly for testing.
 */

import { ai } from '@/ai/genkit'; // Use the shared ai instance

// Define the flow
const helloFlow = ai.defineFlow(
  {
    name: 'helloFlow',
    // No explicit input/output schema for this simple example, Genkit infers.
    // For more complex flows, define Zod schemas like:
    // inputSchema: z.string(),
    // outputSchema: z.string(),
  },
  async (name: string) => { // Explicitly type 'name' if not using an input schema
    // Make a generation request
    // This will use the default model configured in src/ai/genkit.ts
    // (currently 'googleai/gemini-2.0-flash').
    // To use a specific model like Gemini 1.5 Flash for this call, you can do:
    // const { text } = await ai.generate({
    //   model: 'googleai/gemini-1.5-flash-latest',
    //   prompt: `Hello Gemini, my name is ${name}`
    // });
    const { text } = await ai.generate(`Hello Gemini, my name is ${name}`);
    console.log(`[helloFlow] Generated text for ${name}: ${text}`);
    return text;
  }
);

// Example invocation (this will run when src/ai/dev.ts imports this file)
async function runHelloFlowExamples() {
  console.log('[helloFlow] Attempting to run example invocations...');
  try {
    const resultChris = await helloFlow('Chris');
    console.log('[helloFlow] Successfully ran for Chris. Result:', resultChris);

    const resultAlex = await helloFlow('Alex');
    console.log('[helloFlow] Successfully ran for Alex. Result:', resultAlex);
  } catch (error) {
    console.error('[helloFlow] Error running example flow invocations:', error);
  }
}

// Run the examples when this file is loaded by the Genkit dev server
runHelloFlowExamples();

// To make this flow callable from client-side components (e.g., as a React Server Action),
// you would typically export a wrapper function that invokes the flow.
// For example:
/*
import { z } from 'genkit'; // Assuming you'd use Zod for schemas

const HelloInputSchema = z.string().describe("The name to greet.");
export type HelloInput = z.infer<typeof HelloInputSchema>;

const HelloOutputSchema = z.string().describe("The generated greeting.");
export type HelloOutput = z.infer<typeof HelloOutputSchema>;

export async function getGreeting(name: HelloInput): Promise<HelloOutput> {
  // You might add input validation or other logic here if needed.
  return helloFlow(name);
}

// Then, in your client component:
// import { getGreeting } from '@/ai/flows/hello-flow';
// ...
// const greeting = await getGreeting("World");
// console.log(greeting);
*/
