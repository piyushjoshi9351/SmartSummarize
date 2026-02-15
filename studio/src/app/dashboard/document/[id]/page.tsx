"use client";

import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from "@/firebase";
import { ChatView } from "@/components/dashboard/ChatView";
import { SummaryView } from "@/components/dashboard/SummaryView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { doc } from "firebase/firestore";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {document.fileName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Uploaded on {new Date(document.uploadDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">AI Summary</TabsTrigger>
          <TabsTrigger value="chat">Chat with Document</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <SummaryView document={document} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatView document={document} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
