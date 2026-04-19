
'use server';

/**
 * @fileOverview Generates an audience-specific summary using local NLP models with Gemini fallback.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {naiveSummaryBullets} from '@/ai/local-heuristics';
import {
  canUseGeminiFor,
  canUseLocalFor,
  isGeminiEnabled,
  NLP_SERVER_URL,
  shouldUseGeminiPrimary,
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

type SummaryTargets = {
  minWords: number;
  maxWords: number;
  targetSentences: number;
};

function getSummaryTargets(inputText: string): SummaryTargets {
  const wordCount = inputText.trim().split(/\s+/).length;

  if (wordCount > 25000) {
    return {minWords: 700, maxWords: 1200, targetSentences: 18};
  }
  if (wordCount > 12000) {
    return {minWords: 500, maxWords: 900, targetSentences: 14};
  }
  if (wordCount > 5000) {
    return {minWords: 350, maxWords: 700, targetSentences: 10};
  }

  return {minWords: 180, maxWords: 320, targetSentences: 6};
}

const prompt = ai.definePrompt({
  name: 'generateAudienceSpecificSummaryPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateAudienceSpecificSummaryInputSchema},
  output: {schema: GenerateAudienceSpecificSummaryOutputSchema},
  prompt: `You are an expert summarizer, tailoring summaries to specific audiences.

  Summarize the following document for the given audience. Provide the summary as a JSON object containing a 'summary' field, which should be an array of strings. Each string in the array should be a single bullet point of the summary.

  Length rules:
  - For long documents, provide 10-14 detailed bullets (roughly 500-1000 words total).
  - For short documents, provide 5-8 bullets (roughly 180-320 words total).
  Avoid acronym lists and repeated headings.
  Focus on key causes, effects, and solutions.

  Audience-specific focus:
  - Student: explain concepts clearly, include practical implications and examples.
  - Lawyer: emphasize legal/regulatory duties, compliance, liabilities, and policy implications.
  - Researcher: emphasize data patterns, methods, limitations, and evidence strength.
  - General Public: use plain language and highlight real-life impacts and practical actions.

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
    const combined = (output?.summary || []).join(' ');
    const audienceBullets = adjustSummaryForAudience(combined, input.audience);

    return {
      summary: audienceBullets.length > 0 ? audienceBullets : output?.summary || [],
      citations: output?.citations,
    };
  }
);

function adjustSummaryForAudience(summary: string, audience: string): string[] {
  const rawSentences = summary
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const seen = new Set<string>();
  const dedupedSentences = rawSentences.filter((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const audienceKeywords: Record<string, string[]> = {
    Student: [
      'cause',
      'effect',
      'health',
      'environment',
      'risk',
      'solution',
      'prevention',
      'impact',
    ],
    Lawyer: [
      'law',
      'legal',
      'policy',
      'regulation',
      'compliance',
      'liability',
      'enforcement',
      'standard',
      'governance',
      'rights',
    ],
    Researcher: [
      'data',
      'method',
      'evidence',
      'trend',
      'model',
      'analysis',
      'measurement',
      'limitations',
      'uncertainty',
      'sample',
    ],
    'General Public': [
      'air',
      'pollution',
      'health',
      'children',
      'city',
      'public',
      'daily',
      'risk',
      'clean',
      'solution',
    ],
  };

  const audienceLabels: Record<string, string[]> = {
    Student: ['Core idea', 'Why it matters', 'Example', 'Takeaway'],
    Lawyer: ['Legal point', 'Regulatory risk', 'Compliance note', 'Policy implication'],
    Researcher: ['Evidence', 'Method note', 'Observed trend', 'Research implication'],
    'General Public': ['Key point', 'Health impact', 'Practical action'],
  };

  const maxBulletsByAudience: Record<string, number> = {
    Student: 10,
    Lawyer: 14,
    Researcher: 12,
    'General Public': 8,
  };

  const scoringKeywords = audienceKeywords[audience] || [];
  const labels = audienceLabels[audience] || ['Point'];
  const maxBullets = maxBulletsByAudience[audience] || 10;

  const ranked = dedupedSentences
    .map((sentence, index) => {
      const lower = sentence.toLowerCase();
      const keywordScore = scoringKeywords.reduce(
        (total, keyword) => (lower.includes(keyword) ? total + 2 : total),
        0
      );
      const positionScore = Math.max(0, 5 - Math.floor(index / 4));
      return {
        sentence,
        index,
        score: keywordScore + positionScore,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(maxBullets, dedupedSentences.length))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  return ranked
    .map((sentence, index) => {
      const words = sentence.trim().split(/\s+/);
      const trimmedSentence =
        words.length > 55 ? `${words.slice(0, 55).join(' ')}...` : sentence.trim();
      const label = labels[index % labels.length];
      const normalized = trimmedSentence.endsWith('.') ? trimmedSentence : `${trimmedSentence}.`;
      return `${label}: ${normalized}`;
    })
    .filter((sentence) => sentence.length > 0)
    .slice(0, maxBullets);
}

async function summarizeWithLocal(
  input: GenerateAudienceSpecificSummaryInput
): Promise<GenerateAudienceSpecificSummaryOutput> {
  const targets = getSummaryTargets(input.text);

  const response = await fetch(`${NLP_SERVER_URL}/api/summarize`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      text: input.text,
      audience: input.audience,
      language: input.language,
      target_min_words: targets.minWords,
      target_max_words: targets.maxWords,
      target_sentences: targets.targetSentences,
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
  const shouldPreferGemini = shouldUseGeminiPrimary('summary');

  if (shouldPreferGemini && isGeminiEnabled()) {
    return generateAudienceSpecificSummaryFlow(input);
  }

  try {
    if (!canUseLocalFor('summary')) {
      throw new Error('Local NLP server is not configured.');
    }

    return await summarizeWithLocal(input);
  } catch (error) {
    if (canUseGeminiFor('summary')) {
      return generateAudienceSpecificSummaryFlow(input);
    }

    const targets = getSummaryTargets(input.text);
    const fallback = naiveSummaryBullets(input.text, Math.max(6, targets.targetSentences));
    return {summary: adjustSummaryForAudience(fallback.join(' '), input.audience), citations: []};
  }
}
