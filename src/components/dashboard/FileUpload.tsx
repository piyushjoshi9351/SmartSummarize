"use client";

import { useState, useCallback, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Loader2, File, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useUser,
  useFirestore,
  addDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";

const MAX_INLINE_TEXT_CHARS = 500000; // Increased from 200KB to 500KB
const CHUNK_SIZE_CHARS = 500000; // Increased from 150KB to 500KB - fewer chunks = faster writes
const MAX_BATCH_SIZE = 450; // Firestore batch limit is 500, use 450 for safety

function splitIntoChunks(text: string, chunkSize: number) {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
}

// Split batch writes into smaller batches to stay within Firestore 500-operation limit
async function writeBatchesInParallel(
  firestore: any,
  chunksRef: any,
  chunks: string[]
) {
  const batches = [];
  for (let i = 0; i < chunks.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const batchChunks = chunks.slice(i, i + MAX_BATCH_SIZE);
    
    batchChunks.forEach((chunk, batchIndex) => {
      const chunkIndex = i + batchIndex;
      const chunkDoc = doc(chunksRef);
      batch.set(chunkDoc, {
        index: chunkIndex,
        text: chunk,
        createdAt: new Date().toISOString(),
      });
    });
    
    batches.push(batch.commit());
  }
  
  // Execute all batches
  await Promise.all(batches);
}

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        // Validate file size (max 300MB to support very large documents)
        const maxSizeMB = 300;
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `Maximum file size is ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
            variant: "destructive",
          });
          return;
        }
        onDrop(acceptedFiles);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !user) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        const estimatedPages = Math.ceil(file.size / 4000);

        toast({
          title: "⚡ Processing Document...",
          description: `File: ${fileSizeMB}MB (~${estimatedPages} pages). Extracting text...`,
        });

        const formData = new FormData();
        formData.append("file", file);

        const extractResponse = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });

        if (!extractResponse.ok) {
          const errorData = await extractResponse.json();
          throw new Error(errorData.error || "Failed to extract text from file");
        }

        const { text } = await extractResponse.json();

        toast({
          title: "💾 Saving to Database...",
          description: "Creating document record...",
        });

        const docsRef = collection(firestore, "users", user.uid, "documents");
        const textPreview = text.slice(0, 5000);
        const chunked = text.length > MAX_INLINE_TEXT_CHARS;

        const docRef = await addDocumentNonBlocking(docsRef, {
          userId: user.uid,
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          fileType: file.type,
          fileSize: file.size,
          ...(chunked ? {} : { text }),
          textPreview,
          textChunkCount: chunked ? Math.ceil(text.length / CHUNK_SIZE_CHARS) : 0,
          hasChunks: chunked,
        });

        if (!docRef || !docRef.id) {
          throw new Error("Unable to create document record. Please check permissions and try again.");
        }

        if (chunked) {
          const chunksRef = collection(
            firestore,
            "users",
            user.uid,
            "documents",
            docRef.id,
            "chunks"
          );
          const chunks = splitIntoChunks(text, CHUNK_SIZE_CHARS);
          
          // Use optimized parallel batch writes
          toast({
            title: `🔄 Writing ${chunks.length} Chunks in Parallel...`,
            description: `Storing ~${(CHUNK_SIZE_CHARS / 1024).toFixed(0)}KB chunks to database...`,
          });
          
          await writeBatchesInParallel(firestore, chunksRef, chunks);
        }

        toast({
          title: "✅ Document Ready!",
          description: chunked
            ? `${file.name} stored with ${Math.ceil(
                text.length / CHUNK_SIZE_CHARS
              )} optimized chunks.`
            : `${file.name} has been processed and stored.`,
        });

        router.push(`/dashboard/document/${docRef.id}`);
      } catch (error: any) {
        console.error("Upload failed:", error);
        let errorDescription = "Unknown error occurred";
        
        if (error?.message?.includes("Failed")) {
          errorDescription = error.message;
        } else if (error?.message?.includes("fetch") || error instanceof TypeError) {
          errorDescription = "Network error or connection interrupted. Please try again.";
        } else if (error?.message?.includes("timeout")) {
          errorDescription = "Request took too long. File might be too large or network too slow.";
        } else if (error?.message?.includes("413") || error?.message?.includes("Payload")) {
          errorDescription = "File is too large to process. Maximum size is 300MB.";
        } else {
          errorDescription = error?.message || errorDescription;
        }
        
        toast({
          title: "Upload Failed",
          description: errorDescription,
          variant: "destructive",
        });
      }
    });
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="w-full space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex w-full h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out cursor-pointer group",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        
        <div className={cn(
          "flex flex-col items-center justify-center text-center transition-all duration-300 animate-in fade-in",
          file ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <div className="relative mb-4">
            <UploadCloud className={cn(
              "h-16 w-16 transition-all duration-300",
              isDragActive ? "scale-125 -translate-y-2 text-primary animate-bounce" : "text-muted-foreground group-hover:text-primary/70"
            )} />
            {isDragActive && (
              <div className="absolute inset-0 rounded-full bg-primary/20" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
            )}
          </div>
          <p className="text-lg font-semibold text-foreground transition-colors duration-300">
            {isDragActive
              ? "✨ Drop it here!"
              : "📁 Drag & drop your file"}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
             or <span className="text-primary cursor-pointer hover:underline">browse files</span> (PDF, DOCX, up to 300MB)
          </p>
        </div>

        {file && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
             <div className="relative w-full max-w-sm rounded-lg border bg-background p-4 shadow-sm">
                <div className="flex items-start gap-4">
                    <File className="h-10 w-10 text-primary flex-shrink-0" />
                    <div className="flex-grow overflow-hidden">
                        <p className="font-semibold text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {Math.round(file.size / 1024)} KB &bull; {file.type}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 -mt-1 -mr-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                        }}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading & Processing...
          </>
        ) : (
          "Upload & Analyze"
        )}
      </Button>
    </div>
  );
}
