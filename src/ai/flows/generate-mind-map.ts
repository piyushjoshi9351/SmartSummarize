
'use server';

/**
 * @fileOverview Generates a mind map from a document.
 *
 * - generateMindMap - A function that generates a mind map structure.
 * - GenerateMindMapInput - The input type for the generateMindMap function.
 * - MindMapNode - The output type (a recursive node structure).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {buildMindMap} from '@/ai/local-heuristics';
import {shouldUseGeminiPrimary} from '@/ai/provider';

// Define the interface for the recursive type
export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

// Define the Zod schema using the interface and z.lazy() for recursion
const MindMapNodeSchema: z.ZodType<MindMapNode> = z.lazy(() =>
  z.object({
    id: z.string().describe('A unique ID for the node.'),
    label: z.string().describe('The text label for this node.'),
    children: z.array(MindMapNodeSchema).optional().describe('An array of child nodes.'),
  })
);

const GenerateMindMapInputSchema = z.object({
  documentText: z.string().describe('The text content of the document.'),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

async function generateMindMapLocal(input: GenerateMindMapInput): Promise<MindMapNode> {
  try {
    const response = await fetch('http://localhost:5000/api/mind-map', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text: input.documentText}),
    });

    if (!response.ok) {
      console.warn(`⚠️  Mind map API failed (${response.status}), using fallback`);
      return buildMindMap(input.documentText);
    }

    const data = await response.json();
    return data.mindMap || buildMindMap(input.documentText);
  } catch (error) {
    console.warn(`⚠️  Mind map API error: ${error}, using fallback`);
    return buildMindMap(input.documentText);
  }
}

export async function generateMindMap(
  input: GenerateMindMapInput
): Promise<MindMapNode> {
  if (shouldUseGeminiPrimary('mindMap')) {
    return generateMindMapFlow(input);
  }

  return generateMindMapLocal(input);
}

const prompt = ai.definePrompt({
  name: 'generateMindMapPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateMindMapInputSchema},
  output: {schema: MindMapNodeSchema},
  prompt: `You are an expert at creating mind maps from text. Analyze the following document and identify the central concept, main topics, and sub-topics. Structure this as a hierarchical mind map.

The root node should be the central theme of the document.
Each child node should represent a major topic.
Sub-topics should be nested as children of the main topics.
Generate unique IDs for each node.

Your response MUST be a single, valid JSON object that conforms to the output schema. Do not include any other text, markdown, or explanations outside of the JSON object.

Document Text:
{{{documentText}}}
`,
});

const generateMindMapFlow = ai.defineFlow(
  {
    name: 'generateMindMapFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: MindMapNodeSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
