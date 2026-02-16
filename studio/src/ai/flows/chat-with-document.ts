
'use server';

/**
 * @fileOverview Chat with document using local NLP models
 * This replaces the Genkit/Google API implementation with local models
 */

import { z } from 'zod';

const ChatWithDocumentInputSchema = z.object({
  documentText: z.string().describe('The extracted text content of the document.'),
  userQuestion: z.string().describe('The user question about the document.'),
});

export type ChatWithDocumentInput = z.infer<typeof ChatWithDocumentInputSchema>;

const ChatWithDocumentOutputSchema = z.object({
  answer: z.string().describe('The answer to the user question based on document content.'),
});

export type ChatWithDocumentOutput = z.infer<typeof ChatWithDocumentOutputSchema>;

const NLP_SERVER_URL = process.env.NLP_SERVER_URL || 'http://localhost:5000';

export async function chatWithDocument(
  input: ChatWithDocumentInput
): Promise<ChatWithDocumentOutput> {
  try {
    // Call local NLP QA server
    const response = await fetch(`${NLP_SERVER_URL}/api/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: input.documentText,
        question: input.userQuestion,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`NLP server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'QA failed');
    }

    // Format answer with confidence indicator
    const answerText = data.answer || 'Unable to find answer in document.';
    const formattedAnswer = `${answerText} (Source: Document content)`;

    return {
      answer: formattedAnswer,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to chat with document: ${errorMessage}`);
  }
}
