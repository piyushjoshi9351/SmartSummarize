
'use server';

/**
 * @fileOverview Analyze document tone using local NLP models
 * This replaces the Genkit/Google API implementation with local models
 */

import { z } from 'zod';

const AnalyzeDocumentToneInputSchema = z.object({
  documentText: z.string().describe('The text content of the document to analyze.'),
});

export type AnalyzeDocumentToneInput = z.infer<typeof AnalyzeDocumentToneInputSchema>;

const AnalyzeDocumentToneOutputSchema = z.object({
  sentiment: z.string().describe('The overall sentiment of the document.'),
  tones: z.array(z.string()).describe('List of dominant tones found in the text.'),
  writingStyle: z.string().describe('The primary writing style.'),
  emoji: z.string().describe('Emoji representing the overall tone.'),
  summary: z.string().describe('Brief summary of the tone analysis.'),
});

export type AnalyzeDocumentToneOutput = z.infer<typeof AnalyzeDocumentToneOutputSchema>;

const NLP_SERVER_URL = process.env.NLP_SERVER_URL || 'http://localhost:5000';

/**
 * Determine tones based on text content
 */
function determineTones(text: string): string[] {
  const tones: string[] = [];
  const lowerText = text.toLowerCase();

  // Academic indicators
  if (lowerText.includes('study') || lowerText.includes('research') || lowerText.includes('analysis')) {
    tones.push('Academic');
  }

  // Formal indicators
  if (lowerText.includes('therefore') || lowerText.includes('furthermore') || lowerText.includes('moreover')) {
    tones.push('Formal');
  }

  // Critical indicators
  if (lowerText.includes('however') || lowerText.includes('problem') || lowerText.includes('issue')) {
    tones.push('Critical');
  }

  // Optimistic indicators
  if (lowerText.includes('success') || lowerText.includes('great') || lowerText.includes('excellent')) {
    tones.push('Optimistic');
  }

  // Default tones if none detected
  if (tones.length === 0) {
    tones.push('Neutral', 'Informative');
  }

  return tones.slice(0, 4); // Limit to 4 tones
}

/**
 * Determine writing style
 */
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

/**
 * Get emoji based on sentiment
 */
function getSentimentEmoji(sentiment: string): string {
  const emojiMap: Record<string, string> = {
    'POSITIVE': '😊',
    'NEGATIVE': '😞',
    'NEUTRAL': '😐',
    'positive': '😊',
    'negative': '😞',
    'neutral': '😐',
  };

  return emojiMap[sentiment] || '📄';
}

export async function analyzeDocumentTone(
  input: AnalyzeDocumentToneInput
): Promise<AnalyzeDocumentToneOutput> {
  try {
    // Call local NLP tone server
    const response = await fetch(`${NLP_SERVER_URL}/api/tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.documentText }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
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
      summary: `${sentiment} tone. ${writingStyle.toLowerCase()}, with tones of ${tones.join(', ').toLowerCase()}. The document conveys a ${sentiment.toLowerCase()} tone overall.`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to analyze tone: ${errorMessage}`);
  }
}
