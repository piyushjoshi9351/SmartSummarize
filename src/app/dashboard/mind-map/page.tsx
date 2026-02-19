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
import { collection } from "firebase/firestore";
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

    const result = await generateMindMapAction({
      documentText: selectedDoc.text,
    });

    setLoading(false);
    if (result.success && result.data) {
      setMindMapData(result.data);
      toast({
        title: "Mind Map Generated",
        description: `Successfully created a mind map for ${selectedDoc.fileName}.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to generate mind map.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-green-500 to-primary bg-clip-text text-transparent">
          🧠 Mind Map
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Visualize the key concepts, ideas, and connections within your documents in a beautiful interactive map.
        </p>
      </div>

      <Card className="border-primary/20 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader className="bg-gradient-to-r from-green-500/5 to-primary/5 border-b border-primary/10">
          <CardTitle className="text-2xl">✨ Generate a Mind Map</CardTitle>
          <CardDescription className="text-sm mt-1">
            Select a document to create an interactive visual map of its key concepts.
          </CardDescription>
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
                      🧠 Generating your mind map... visualizing the concepts and connections. This may take a moment.
                    </p>
                </div>
            </CardContent>
        </Card>
      )}

      {mindMapData && !loading && <MindMapDisplay mindMapData={mindMapData} />}

      {!mindMapData && !loading && (
         <div className="text-center py-16 border-2 border-dashed rounded-xl border-green-500/20 bg-gradient-to-br from-green-500/5 to-primary/5 animate-in fade-in duration-500" style={{ animationDelay: "200ms" }}>
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
