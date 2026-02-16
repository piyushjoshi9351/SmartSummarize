
'use server';

/**
 * @fileOverview Generates suggested questions based on document text.
 *
 * - generateSuggestedQuestions - A function that suggests questions to ask about a document.
 * - GenerateSuggestedQuestionsInput - The input type.
 * - GenerateSuggestedQuestionsOutput - The output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSuggestedQuestionsInputSchema = z.object({
  documentText: z.string().describe('The text content of the document.'),
});
export type GenerateSuggestedQuestionsInput = z.infer<
  typeof GenerateSuggestedQuestionsInputSchema
>;

const GenerateSuggestedQuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .describe('An array of 3 to 5 suggested questions.'),
});
export type GenerateSuggestedQuestionsOutput = z.infer<
  typeof GenerateSuggestedQuestionsOutputSchema
>;

export async function generateSuggestedQuestions(
  input: GenerateSuggestedQuestionsInput
): Promise<GenerateSuggestedQuestionsOutput> {
  return generateSuggestedQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSuggestedQuestionsPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: GenerateSuggestedQuestionsInputSchema },
  output: { schema: GenerateSuggestedQuestionsOutputSchema },
  prompt: `You are an expert at analyzing documents and identifying key topics for discussion.
  
  Read the following document text and generate a list of 3-5 insightful and relevant questions that a user might want to ask about it.
  
  Focus on questions that encourage deeper understanding of the document's main points, arguments, or data.
  
  Your response MUST be a single, valid JSON object that conforms to the output schema. Do not add any introductory text or explanation. Your response should start with { and end with }.
  
  Document Text:
  {{{documentText}}}
  `,
});

const generateSuggestedQuestionsFlow = ai.defineFlow(
  {
    name: 'generateSuggestedQuestionsFlow',
    inputSchema: GenerateSuggestedQuestionsInputSchema,
    outputSchema: GenerateSuggestedQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
