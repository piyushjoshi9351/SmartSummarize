"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Share2 } from "lucide-react";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { DocumentData } from "@/lib/types";
import { generateMindMapAction } from "@/actions/documents";
import { useToast } from "@/hooks/use-toast";
import { MindMapNode } from "@/ai/flows/generate-mind-map";
import { MindMapDisplay } from "@/components/dashboard/MindMapDisplay";

// Increased to 300 seconds (5 minutes) to handle large documents
export const maxDuration = 300;

export default function MindMapPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);

  const docsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, "users", user.uid, "documents");
  }, [firestore, user]);

  const { data: documents, isLoading: isLoadingDocs } =
    useCollection<DocumentData>(docsQuery);

  const resolveDocumentText = async (documentId: string) => {
    if (!user) return "";

    const documentRef = doc(firestore, "users", user.uid, "documents", documentId);
    const documentSnap = await getDoc(documentRef);
    if (!documentSnap.exists()) return "";

    const data = documentSnap.data() as DocumentData;
    if (data.text?.trim()) return data.text;

    if (data.hasChunks) {
      const chunksRef = collection(
        firestore,
        "users",
        user.uid,
        "documents",
        documentId,
        "chunks"
      );
      const chunksSnap = await getDocs(query(chunksRef, orderBy("index", "asc")));
      const text = chunksSnap.docs
        .map((chunkDoc) => (chunkDoc.data() as { text?: string }).text || "")
        .join("");
      if (text.trim()) return text;
    }

    return data.textPreview || "";
  };

  const handleGenerate = async () => {
    if (!selectedDocId) {
      toast({
        title: "No document selected",
        description: "Please select a document to generate a mind map.",
        variant: "destructive",
      });
      return;
    }

    const selectedDoc = documents?.find((d) => d.id === selectedDocId);
    if (!selectedDoc) return;

    setLoading(true);
    setMindMapData(null);

    const documentText = await resolveDocumentText(selectedDoc.id);
    if (!documentText.trim()) {
      setLoading(false);
      toast({
        title: "Document text unavailable",
        description: "Selected document has no readable text.",
        variant: "destructive",
      });
      return;
    }

    const result = await generateMindMapAction({ documentText });

    setLoading(false);
    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setMindMapData(result.data);
    toast({
      title: "Mind Map Generated",
      description: `Successfully created a mind map for ${selectedDoc.fileName}.`,
    });
  };

  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Mind Map
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">Visual map of key concepts.</p>
      </div>

      <Card className="border-primary/20 bg-card/80 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10">
          <CardTitle className="text-2xl">Generate Mind Map</CardTitle>
          <CardDescription className="text-sm mt-1">Select a document and visualize its concept map.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDocs ? (
            <div className="flex items-center space-x-3 animate-in fade-in">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading your documents...</span>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select
                onValueChange={setSelectedDocId}
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={loading || !selectedDocId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </div>
          ) : (
             <div className="text-center py-8 text-muted-foreground">
                <p>You haven't uploaded any documents yet.</p>
                <p className="text-sm mt-1">Upload a document to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {loading && (
        <Card className="border-primary/20 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: "100ms" }}>
            <CardContent className="pt-8">
                <div className="flex flex-col items-center justify-center space-y-4 py-16">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                    <p className="text-muted-foreground text-center text-sm">
                      Generating your mind map... this may take a moment.
                    </p>
                </div>
            </CardContent>
        </Card>
      )}

      {mindMapData && !loading && <MindMapDisplay mindMapData={mindMapData} />}

      {!mindMapData && !loading && (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 animate-in fade-in duration-500" style={{ animationDelay: "200ms" }}>
            <Share2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mt-4">Your mind map will appear here</h3>
            <p className="text-muted-foreground mt-2 text-sm">
                Select a document above and click "Generate" to create your visual concept map.
            </p>
        </div>
      )}
    </div>
  );
}
