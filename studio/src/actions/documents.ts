
"use server";

import {
  generateAudienceSpecificSummary,
  GenerateAudienceSpecificSummaryInput,
} from "@/ai/flows/generate-audience-specific-summary";
import {
  chatWithDocument,
  ChatWithDocumentInput,
} from "@/ai/flows/chat-with-document";
import {
  generateMindMap,
  GenerateMindMapInput,
} from "@/ai/flows/generate-mind-map";
import {
  analyzeDocumentTone,
  AnalyzeDocumentToneInput,
} from "@/ai/flows/analyze-document-tone";
import {
  generateAudioSummary,
  GenerateAudioSummaryInput,
} from "@/ai/flows/generate-audio-summary";
import {
  generateSuggestedQuestions,
  GenerateSuggestedQuestionsInput,
} from "@/ai/flows/generate-suggested-questions";
import {
  compareDocuments,
  CompareDocumentsInput,
} from "@/ai/flows/compare-documents";
import mammoth from "mammoth";
import pdf from "pdf-parse";

async function safeAction<T>(action: Promise<T>): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await action;
    return { success: true, data };
  } catch (error) {
    console.error("Action failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function extractTextFromFile({
  fileBuffer,
  fileType,
}: {
  fileBuffer: ArrayBuffer;
  fileType: string;
}): Promise<string> {
  const buffer = Buffer.from(fileBuffer);

  try {
    if (fileType === "application/pdf") {
      const data = await pdf(buffer);
      if (!data.text || data.text.trim().length === 0) {
        throw new Error(
          "PDF appears to be empty or contains no extractable text. This might be a scanned image PDF without OCR."
        );
      }
      return data.text;
    } else if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      if (!value || value.trim().length === 0) {
        throw new Error("Document appears to be empty or has no extractable text.");
      }
      return value;
    } else {
      throw new Error("Unsupported file type");
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to extract text from file.";
    throw new Error(errorMessage);
  }
}

export async function generateSummaryAction(
  input: GenerateAudienceSpecificSummaryInput
) {
  return safeAction(generateAudienceSpecificSummary(input));
}

export async function chatAction(input: ChatWithDocumentInput) {
  return safeAction(chatWithDocument(input));
}

export async function generateMindMapAction(input: GenerateMindMapInput) {
  return safeAction(generateMindMap(input));
}

export async function analyzeDocumentToneAction(
  input: AnalyzeDocumentToneInput
) {
  return safeAction(analyzeDocumentTone(input));
}

export async function generateAudioSummaryAction(
  input: GenerateAudioSummaryInput
) {
  return safeAction(generateAudioSummary(input));
}

export async function generateSuggestedQuestionsAction(
  input: GenerateSuggestedQuestionsInput
) {
  return safeAction(generateSuggestedQuestions(input));
}

export async function compareDocumentsAction(input: CompareDocumentsInput) {
  return safeAction(compareDocuments(input));
}
