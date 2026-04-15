
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
import {compareDocumentsLocal} from '@/ai/local-heuristics';
import {shouldUseGeminiPrimary, NLP_SERVER_URL} from '@/ai/provider';

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
  similarityScore: z.number().min(0).max(1).describe('Overall similarity score from 0 to 1.').optional(),
  similarSections: z
    .array(
      z.object({
        score: z.number(),
        doc1: z.string(),
        doc2: z.string(),
      })
    )
    .optional(),
  differentSections: z
    .array(
      z.object({
        score: z.number(),
        doc1: z.string(),
      })
    )
    .optional(),
});
export type CompareDocumentsOutput = z.infer<typeof CompareDocumentsOutputSchema>;

async function compareDocumentsViaAPI(input: CompareDocumentsInput): Promise<CompareDocumentsOutput> {
  try {
    const response = await fetch(`${NLP_SERVER_URL}/api/compare-documents`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        documentOneText: input.documentOneText,
        documentTwoText: input.documentTwoText,
        documentOneName: input.documentOneName,
        documentTwoName: input.documentTwoName,
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️  Comparison API failed (${response.status}), using fallback`);
      return compareDocumentsLocal(
        input.documentOneText,
        input.documentTwoText,
        input.documentOneName,
        input.documentTwoName
      );
    }

    const data = await response.json();
    return {
      similarities: data.similarities || [],
      differences: data.differences || [],
      conclusion: data.conclusion || "Comparison could not be completed.",
      similarityScore:
        typeof data.similarity_score === 'number' ? data.similarity_score : undefined,
      similarSections: Array.isArray(data.similar_sections) ? data.similar_sections : [],
      differentSections: Array.isArray(data.different_sections) ? data.different_sections : [],
    };
  } catch (error) {
    console.warn(`⚠️  Comparison API error: ${error}, using fallback`);
    return compareDocumentsLocal(
      input.documentOneText,
      input.documentTwoText,
      input.documentOneName,
      input.documentTwoName
    );
  }
}

export async function compareDocuments(input: CompareDocumentsInput): Promise<CompareDocumentsOutput> {
  if (shouldUseGeminiPrimary('compare')) {
    return compareDocumentsFlow(input);
  }

  return compareDocumentsViaAPI(input);
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
