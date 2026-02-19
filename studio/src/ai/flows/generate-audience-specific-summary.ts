
'use server';

/**
 * @fileOverview Generates an audience-specific summary using local NLP models
 * This replaces the Genkit/Google API implementation with local models
 */

import { z } from 'zod';

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
  summary: z.array(z.string()).describe('An array of bullet points of the summary.'),
  citations: z
    .array(z.object({ page: z.number(), paragraph: z.number() }))
    .describe('List of citation references.')
    .optional(),
});

export type GenerateAudienceSpecificSummaryOutput = z.infer<
  typeof GenerateAudienceSpecificSummaryOutputSchema
>;

const NLP_SERVER_URL = process.env.NLP_SERVER_URL || 'http://localhost:5000';
const SUMMARY_TARGET_MIN_WORDS = 150;
const SUMMARY_TARGET_MAX_WORDS = 200;

/**
 * Adjust summary complexity based on audience
 */
function adjustSummaryForAudience(
  summary: string,
  audience: string
): string[] {
  const sentences = summary.split('.').filter(s => s.trim().length > 0);
  
  const adjustments: Record<string, (summary: string[]) => string[]> = {
    'Student': (sentences) => sentences.slice(0, Math.min(3, sentences.length)),
    'Lawyer': (sentences) => sentences,
    'Researcher': (sentences) => sentences,
    'General Public': (sentences) => sentences.slice(0, Math.min(2, sentences.length)),
  };

  const adjuster = adjustments[audience] || ((s) => s);
  const adjusted = adjuster(sentences);

  return adjusted.map(s => s.trim() + '.').filter(s => s.length > 1);
}

export async function generateAudienceSpecificSummary(
  input: GenerateAudienceSpecificSummaryInput
): Promise<GenerateAudienceSpecificSummaryOutput> {
  try {
    // Call local NLP server
    const response = await fetch(`${NLP_SERVER_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.text,
        target_min_words: SUMMARY_TARGET_MIN_WORDS,
        target_max_words: SUMMARY_TARGET_MAX_WORDS,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`NLP server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Summarization failed');
    }

    // Adjust summary for audience
    const summaryText = data.summary || input.text;
    const bulletPoints = adjustSummaryForAudience(summaryText, input.audience);

    return {
      summary: bulletPoints,
      citations: [], // Local model doesn't track citations
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate summary: ${errorMessage}`);
  }
}
