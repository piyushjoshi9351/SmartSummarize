"use client";

import { useState } from "react";

// Support for large document analysis
export const maxDuration = 300;
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
import { Loader2, Beaker } from "lucide-react";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection } from "firebase/firestore";
import { DocumentData } from "@/lib/types";
import { analyzeDocumentToneAction } from "@/actions/documents";
import { useToast } from "@/hooks/use-toast";
import { AnalyzeDocumentToneOutput } from "@/ai/flows/analyze-document-tone";
import { Badge } from "@/components/ui/badge";

export default function AnalysisPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeDocumentToneOutput | null>(null);

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
        description: "Please select a document to analyze.",
        variant: "destructive",
      });
      return;
    }

    const selectedDoc = documents?.find((d) => d.id === selectedDocId);
    if (!selectedDoc) return;

    setLoading(true);
    setAnalysisResult(null);

    const result = await analyzeDocumentToneAction({
      documentText: selectedDoc.text,
    });

    setLoading(false);
    if (result.success && result.data) {
      setAnalysisResult(result.data);
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${selectedDoc.fileName}.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to analyze document.",
        variant: "destructive",
      });
    }
  };

  const sentimentColors: { [key: string]: string } = {
    Positive: "text-green-500 bg-green-500/10",
    Negative: "text-red-500 bg-red-500/10",
    Neutral: "text-yellow-500 bg-yellow-500/10",
    Mixed: "text-blue-500 bg-blue-500/10",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tone &amp; Style Analysis
        </h1>
        <p className="text-muted-foreground">
          Understand the author's voice, sentiment, and writing style.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Analysis</CardTitle>
          <CardDescription>
            Select a document to run a linguistic analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDocs ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading documents...</span>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select onValueChange={setSelectedDocId} disabled={loading}>
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
              <Button
                onClick={handleGenerate}
                disabled={loading || !selectedDocId}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Document
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>You haven't uploaded any documents yet.</p>
              <p className="text-sm mt-1">
                Upload a document to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Performing analysis... this can take a moment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisResult && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card
                className={
                  sentimentColors[analysisResult.sentiment] || "bg-secondary"
                }
              >
                <CardHeader className="items-center text-center">
                  <CardDescription>Overall Sentiment</CardDescription>
                  <div className="text-6xl">{analysisResult.emoji}</div>
                  <CardTitle className="text-2xl">
                    {analysisResult.sentiment}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Dominant Tones</CardDescription>
                  <CardTitle>Tonal Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {analysisResult.tones.map((tone) => (
                    <Badge
                      key={tone}
                      variant="secondary"
                      className="text-sm"
                    >
                      {tone}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Author's Style</CardDescription>
                  <CardTitle>Writing Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-primary">
                    {analysisResult.writingStyle}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Analysis Summary</h3>
              <p className="text-muted-foreground">{analysisResult.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!analysisResult && !loading && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Beaker className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold mt-4">
            Your analysis will appear here
          </h3>
          <p className="text-muted-foreground mt-2">
            Select a document and click "Analyze" to start.
          </p>
        </div>
      )}
    </div>
  );
}
