
'use server';

/**
 * @fileOverview Generates an audience-specific summary using local NLP models with Gemini fallback.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {naiveSummaryBullets} from '@/ai/local-heuristics';
import {
  canUseGeminiFor,
  getAiProvider,
  isGeminiEnabled,
  NLP_SERVER_URL,
} from '@/ai/provider';

const GenerateAudienceSpecificSummaryInputSchema = z.object({
  text: z.string().describe('The text content of the document to summarize.'),
  audience: z
    .enum(['Student', 'Lawyer', 'Researcher', 'General Public'])
    .describe('The target audience for the summary.'),
  language: z
    .enum(['English', 'Spanish', 'French', 'German', 'Hindi'])
    .describe('The language for the summary.'),
});
export type GenerateAudienceSpecificSummaryInput = z.infer<
  typeof GenerateAudienceSpecificSummaryInputSchema
>;

const GenerateAudienceSpecificSummaryOutputSchema = z.object({
  summary: z
    .array(z.string())
    .describe('An array of strings, where each string is a bullet point of the summary.'),
  citations: z
    .array(z.object({page: z.number(), paragraph: z.number()}))
    .describe('List of citation references.')
    .optional(),
});
export type GenerateAudienceSpecificSummaryOutput = z.infer<
  typeof GenerateAudienceSpecificSummaryOutputSchema
>;

const SUMMARY_TARGET_MIN_WORDS = 150;
const SUMMARY_TARGET_MAX_WORDS = 200;

const prompt = ai.definePrompt({
  name: 'generateAudienceSpecificSummaryPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateAudienceSpecificSummaryInputSchema},
  output: {schema: GenerateAudienceSpecificSummaryOutputSchema},
  prompt: `You are an expert summarizer, tailoring summaries to specific audiences.

  Summarize the following document for the given audience. Provide the summary as a JSON object containing a 'summary' field, which should be an array of strings. Each string in the array should be a single bullet point of the summary.

  Length: 150-200 words total.
  Avoid acronym lists and repeated headings.
  Focus on key causes, effects, and solutions.

  If possible, also include a 'citations' field with citation references (page and paragraph numbers). For citations, make your best guess if page/paragraph numbers are not explicitly available in the text. If you cannot find any citations, omit the citations field entirely from the JSON output.

  The summary must be in {{{language}}}.

  Your response MUST be a single, valid JSON object that conforms to the output schema. Do not include any other text, markdown, or explanations outside of the JSON object.

  Audience: {{{audience}}}

  Document Text:
  {{{text}}}
`,
});

const generateAudienceSpecificSummaryFlow = ai.defineFlow(
  {
    name: 'generateAudienceSpecificSummaryFlow',
    inputSchema: GenerateAudienceSpecificSummaryInputSchema,
    outputSchema: GenerateAudienceSpecificSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

function adjustSummaryForAudience(summary: string, audience: string): string[] {
  const sentences = summary.split('.').filter((sentence) => sentence.trim().length > 0);

  const adjustments: Record<string, (summary: string[]) => string[]> = {
    Student: (items) => items.slice(0, Math.min(3, items.length)),
    Lawyer: (items) => items,
    Researcher: (items) => items,
    'General Public': (items) => items.slice(0, Math.min(2, items.length)),
  };

  const adjuster = adjustments[audience] || ((items) => items);
  return adjuster(sentences)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => (sentence.endsWith('.') ? sentence : `${sentence}.`));
}

async function summarizeWithLocal(
  input: GenerateAudienceSpecificSummaryInput
): Promise<GenerateAudienceSpecificSummaryOutput> {
  const response = await fetch(`${NLP_SERVER_URL}/api/summarize`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      text: input.text,
      target_min_words: SUMMARY_TARGET_MIN_WORDS,
      target_max_words: SUMMARY_TARGET_MAX_WORDS,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`NLP server error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Summarization failed');
  }

  const summaryText = data.summary || input.text;
  return {
    summary: adjustSummaryForAudience(summaryText, input.audience),
    citations: [],
  };
}

export async function generateAudienceSpecificSummary(
  input: GenerateAudienceSpecificSummaryInput
): Promise<GenerateAudienceSpecificSummaryOutput> {
  const provider = getAiProvider();
  const shouldPreferGemini =
    provider === 'gemini' || (provider === 'hybrid' && input.language !== 'English');

  if (shouldPreferGemini && isGeminiEnabled()) {
    return generateAudienceSpecificSummaryFlow(input);
  }

  try {
    return await summarizeWithLocal(input);
  } catch (error) {
    if (canUseGeminiFor('summary')) {
      return generateAudienceSpecificSummaryFlow(input);
    }

    const fallback = naiveSummaryBullets(input.text, 4);
    return {summary: fallback, citations: []};
  }
}
