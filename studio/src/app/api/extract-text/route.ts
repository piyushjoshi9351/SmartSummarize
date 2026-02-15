import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile } from "@/actions/documents";

// Support large file uploads (up to 5 minutes for processing)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 150MB)
    const maxSizeMB = 150;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `File size exceeds ${maxSizeMB}MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
        },
        { status: 413 }
      );
    }

    // Create a Blob from the file and convert to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    const result = await extractTextFromFile({
      fileBuffer: arrayBuffer,
      fileType: file.type,
    });

    return NextResponse.json({
      success: true,
      text: result,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("Text extraction error:", error);
    const errorMessage = error?.message || "Failed to extract text from file";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
