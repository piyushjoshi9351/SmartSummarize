
'use server';

/**
 * @fileOverview Analyze document tone using local NLP models with Gemini fallback.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {canUseGeminiFor, NLP_SERVER_URL} from '@/ai/provider';

const AnalyzeDocumentToneInputSchema = z.object({
  documentText: z.string().describe('The text content of the document to analyze.'),
});
export type AnalyzeDocumentToneInput = z.infer<typeof AnalyzeDocumentToneInputSchema>;

const AnalyzeDocumentToneOutputSchema = z.object({
  sentiment: z
    .string()
    .describe('The overall sentiment of the document (e.g., Positive, Negative, Neutral, Mixed).'),
  tones: z
    .array(z.string())
    .describe('A list of 2-4 dominant tones found in the text (e.g., Formal, Optimistic, Critical).'),
  writingStyle: z
    .string()
    .describe('The primary writing style (e.g., Academic, Narrative, Persuasive, Technical).'),
  emoji: z
    .string()
    .describe('A single emoji that best represents the overall sentiment and tone of the document.'),
  summary: z
    .string()
    .describe('A brief one-paragraph summary of the tone and style analysis.'),
});
export type AnalyzeDocumentToneOutput = z.infer<typeof AnalyzeDocumentToneOutputSchema>;

const prompt = ai.definePrompt({
  name: 'analyzeDocumentTonePrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: AnalyzeDocumentToneInputSchema},
  output: {schema: AnalyzeDocumentToneOutputSchema},
  prompt: `You are an expert linguistic analyst. Analyze the following document to determine its sentiment, tone, and writing style.

  Based on your analysis, provide the following:
  1.  **Sentiment:** A single word describing the overall sentiment (e.g., Positive, Negative, Neutral, Mixed).
  2.  **Tones:** A list of 2-4 dominant tones (e.g., Formal, Informal, Optimistic, Pessimistic, Humorous, Serious, Critical).
  3.  **Writing Style:** The primary writing style (e.g., Academic, Narrative, Persuasive, Technical, Expository).
  4.  **Emoji:** A single emoji that best represents the overall feeling of the text.
  5.  **Summary:** A concise, one-paragraph summary explaining your analysis of the document's tone and style.

  Your response MUST be a single, valid JSON object that conforms to the output schema. Do not include any other text, markdown, or explanations outside of the JSON object.

  Document Text:
  {{{documentText}}}
  `,
});

const analyzeDocumentToneFlow = ai.defineFlow(
  {
    name: 'analyzeDocumentToneFlow',
    inputSchema: AnalyzeDocumentToneInputSchema,
    outputSchema: AnalyzeDocumentToneOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

function determineTones(text: string): string[] {
  const tones: string[] = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes('study') || lowerText.includes('research') || lowerText.includes('analysis')) {
    tones.push('Academic');
  }

  if (lowerText.includes('therefore') || lowerText.includes('furthermore') || lowerText.includes('moreover')) {
    tones.push('Formal');
  }

  if (lowerText.includes('however') || lowerText.includes('problem') || lowerText.includes('issue')) {
    tones.push('Critical');
  }

  if (lowerText.includes('success') || lowerText.includes('great') || lowerText.includes('excellent')) {
    tones.push('Optimistic');
  }

  if (tones.length === 0) {
    tones.push('Neutral', 'Informative');
  }

  return tones.slice(0, 4);
}

function determineWritingStyle(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('study') || lowerText.includes('research') || lowerText.includes('methodology')) {
    return 'Academic';
  }
  if (lowerText.includes('algorithm') || lowerText.includes('function') || lowerText.includes('technical')) {
    return 'Technical';
  }
  if (lowerText.includes('convincingly') || lowerText.includes('argue') || lowerText.includes('opinion')) {
    return 'Persuasive';
  }
  if (lowerText.includes('once upon') || lowerText.includes('story') || lowerText.includes('character')) {
    return 'Narrative';
  }

  return 'Expository';
}

function getSentimentEmoji(sentiment: string): string {
  const emojiMap: Record<string, string> = {
    POSITIVE: '😊',
    NEGATIVE: '😞',
    NEUTRAL: '😐',
    positive: '😊',
    negative: '😞',
    neutral: '😐',
  };

  return emojiMap[sentiment] || '📄';
}

async function analyzeWithLocal(
  input: AnalyzeDocumentToneInput
): Promise<AnalyzeDocumentToneOutput> {
  const response = await fetch(`${NLP_SERVER_URL}/api/tone`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text: input.documentText}),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`NLP server error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Tone analysis failed');
  }

  const sentiment = data.sentiment || 'Neutral';
  const tones = determineTones(input.documentText);
  const writingStyle = determineWritingStyle(input.documentText);
  const emoji = getSentimentEmoji(sentiment);

  return {
    sentiment,
    tones,
    writingStyle,
    emoji,
    summary: `${sentiment} tone. ${writingStyle.toLowerCase()}, with tones of ${tones
      .join(', ')
      .toLowerCase()}. The document conveys a ${sentiment.toLowerCase()} tone overall.`,
  };
}

export async function analyzeDocumentTone(
  input: AnalyzeDocumentToneInput
): Promise<AnalyzeDocumentToneOutput> {
  try {
    return await analyzeWithLocal(input);
  } catch (error) {
    if (canUseGeminiFor('tone')) {
      return analyzeDocumentToneFlow(input);
    }

    const sentiment = 'Neutral';
    const tones = determineTones(input.documentText);
    const writingStyle = determineWritingStyle(input.documentText);
    const emoji = getSentimentEmoji(sentiment);

    return {
      sentiment,
      tones,
      writingStyle,
      emoji,
      summary: `${sentiment} tone. ${writingStyle.toLowerCase()}, with tones of ${tones
        .join(', ')
        .toLowerCase()}. The document conveys a neutral tone overall.`,
    };
  }
}
