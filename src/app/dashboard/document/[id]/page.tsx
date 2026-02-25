"use client";

import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
} from "@/firebase";
import { ChatView } from "@/components/dashboard/ChatView";
import { SummaryView } from "@/components/dashboard/SummaryView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { DocumentData } from "@/lib/types";

// Support for large documents and AI processing
export const maxDuration = 300;

export default function DocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useUser();
  const firestore = useFirestore();

  const docRef = useMemoFirebase(() => {
    if (!user || !id) return null;
    return doc(firestore, "users", user.uid, "documents", id);
  }, [firestore, user, id]);

  const {
    data: document,
    isLoading,
    error,
  } = useDoc<DocumentData>(docRef);

  const chunksQuery = useMemoFirebase(() => {
    if (!user || !id) return null;
    return query(
      collection(firestore, "users", user.uid, "documents", id, "chunks"),
      orderBy("index", "asc")
    );
  }, [firestore, id, user]);

  const {
    data: chunks,
    isLoading: isChunksLoading,
  } = useCollection<{ index: number; text: string }>(chunksQuery);

  const resolvedText = document?.text
    ? document.text
    : document?.hasChunks && chunks
    ? chunks.map((chunk) => chunk.text).join("")
    : document?.textPreview || "";

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error loading document.</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (!document) {
    return <div className="text-center">Document not found.</div>;
  }

  if (document.hasChunks && isChunksLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 pb-6 border-b border-border/50 animate-in slide-in-from-top duration-500">
        <div className="rounded-2xl p-3 bg-primary/10 border border-primary/20 shadow-md shadow-primary/20">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
            {document.fileName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Uploaded on {new Date(document.uploadDate).toLocaleDateString()} • {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(1)}MB` : 'Size unknown'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl border border-border/60">
          <TabsTrigger value="summary" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg transition-all duration-300">AI Summary</TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-accent/15 data-[state=active]:text-accent rounded-lg transition-all duration-300">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="animate-in fade-in duration-300">
          <SummaryView document={{ ...document, text: resolvedText }} />
        </TabsContent>
        <TabsContent value="chat" className="animate-in fade-in duration-300">
          <ChatView document={{ ...document, text: resolvedText }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
