
'use server';

/**
 * @fileOverview Chat with document using local NLP models with Gemini fallback.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {naiveAnswer} from '@/ai/local-heuristics';
import {canUseGeminiFor, NLP_SERVER_URL} from '@/ai/provider';

const ChatWithDocumentInputSchema = z.object({
  documentText: z.string().describe('The extracted text content of the document.'),
  userQuestion: z.string().describe('The user question about the document.'),
});

export type ChatWithDocumentInput = z.infer<typeof ChatWithDocumentInputSchema>;

const ChatWithDocumentOutputSchema = z.object({
  answer: z.string().describe(
    "The complete, single-string answer to the user's question, with any citations included directly in the text."
  ),
});

export type ChatWithDocumentOutput = z.infer<typeof ChatWithDocumentOutputSchema>;

const chatWithDocumentPrompt = ai.definePrompt({
  name: 'chatWithDocumentPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: ChatWithDocumentInputSchema},
  output: {schema: ChatWithDocumentOutputSchema},
  prompt: `You are a helpful assistant that answers questions about a document. You will be given the document text and a user question. You must answer the question using only the information in the document.

If you cannot answer the question from the document alone, state that clearly.

Provide citations to the page or paragraph numbers directly in the text where you found the information, for example: "The sky is blue [page 1, para 2]."

Your response should be a single block of text, formatted as a JSON object with a single key "answer".

Document Text:
{{{documentText}}}

User Question:
{{{userQuestion}}}`,
});

const chatWithDocumentFlow = ai.defineFlow(
  {
    name: 'chatWithDocumentFlow',
    inputSchema: ChatWithDocumentInputSchema,
    outputSchema: ChatWithDocumentOutputSchema,
  },
  async input => {
    const {output} = await chatWithDocumentPrompt(input);
    return output!;
  }
);

async function chatWithLocal(
  input: ChatWithDocumentInput
): Promise<ChatWithDocumentOutput> {
  const response = await fetch(`${NLP_SERVER_URL}/api/qa`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({context: input.documentText, question: input.userQuestion}),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`NLP server error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'QA failed');
  }

  const answerText = data.answer || 'Unable to find answer in document.';
  return {answer: `${answerText} (Source: Document content)`};
}

export async function chatWithDocument(
  input: ChatWithDocumentInput
): Promise<ChatWithDocumentOutput> {
  try {
    return await chatWithLocal(input);
  } catch (error) {
    if (canUseGeminiFor('chat')) {
      return chatWithDocumentFlow(input);
    }

    return {answer: naiveAnswer(input.documentText, input.userQuestion)};
  }
}
