
'use server';

/**
 * @fileOverview Compares two documents and highlights their similarities and differences.
 *
 * - compareDocuments - A function that performs the comparison.
 * - CompareDocumentsInput - The input type for the compareDocuments function.
 * - CompareDocumentsOutput - The return type for the compareDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompareDocumentsInputSchema = z.object({
  documentOneText: z.string().describe('The text content of the first document.'),
  documentTwoText: z.string().describe('The text content of the second document.'),
  documentOneName: z.string().describe('The name of the first document.'),
  documentTwoName: z.string().describe('The name of the second document.'),
});
export type CompareDocumentsInput = z.infer<typeof CompareDocumentsInputSchema>;

const CompareDocumentsOutputSchema = z.object({
  similarities: z.array(z.string()).describe("A list of key similarities between the two documents."),
  differences: z.array(z.string()).describe("A list of key differences between the two documents."),
  conclusion: z.string().describe("A brief concluding summary of the comparison."),
});
export type CompareDocumentsOutput = z.infer<typeof CompareDocumentsOutputSchema>;

export async function compareDocuments(input: CompareDocumentsInput): Promise<CompareDocumentsOutput> {
  return compareDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'compareDocumentsPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: CompareDocumentsInputSchema},
  output: {schema: CompareDocumentsOutputSchema},
  prompt: `You are an expert research analyst. Your task is to compare two documents and provide a concise analysis of their similarities and differences.

  The documents are:
  1.  **{{{documentOneName}}}**:
      \`\`\`
      {{{documentOneText}}}
      \`\`\`
  2.  **{{{documentTwoName}}}**:
      \`\`\`
      {{{documentTwoText}}}
      \`\`\`

  Analyze both documents and generate the following:
  1.  **Similarities**: A list of the most important shared themes, arguments, or data points.
  2.  **Differences**: A list of the most significant contrasting points, arguments, or conclusions.
  3.  **Conclusion**: A brief summary paragraph that encapsulates the overall relationship between the two documents (e.g., do they support each other, contradict, or discuss different facets of the same topic?).

  Your response MUST be a single, valid JSON object that conforms to the output schema. Do not include any other text, markdown, or explanations outside of the JSON object.
  `,
});

const compareDocumentsFlow = ai.defineFlow(
  {
    name: 'compareDocumentsFlow',
    inputSchema: CompareDocumentsInputSchema,
    outputSchema: CompareDocumentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
