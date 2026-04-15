"use client";

import { useState } from "react";

// Support for large document comparison
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
import { Loader2, GitCompareArrows, CheckCircle2, XCircle } from "lucide-react";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { DocumentData } from "@/lib/types";
import { compareDocumentsAction } from "@/actions/documents";
import { useToast } from "@/hooks/use-toast";
import { CompareDocumentsOutput } from "@/ai/flows/compare-documents";
import { Separator } from "@/components/ui/separator";

export default function ComparePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDoc1Id, setSelectedDoc1Id] = useState<string | null>(null);
  const [selectedDoc2Id, setSelectedDoc2Id] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] =
    useState<CompareDocumentsOutput | null>(null);

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
    if (!selectedDoc1Id || !selectedDoc2Id) {
      toast({
        title: "Two documents required",
        description: "Please select two documents to compare.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDoc1Id === selectedDoc2Id) {
      toast({
        title: "Select different documents",
        description: "Please choose two different documents for comparison.",
        variant: "destructive",
      });
      return;
    }

    const doc1 = documents?.find((d) => d.id === selectedDoc1Id);
    const doc2 = documents?.find((d) => d.id === selectedDoc2Id);
    if (!doc1 || !doc2) return;

    setLoading(true);
    setComparisonResult(null);

    const [documentOneText, documentTwoText] = await Promise.all([
      resolveDocumentText(doc1.id),
      resolveDocumentText(doc2.id),
    ]);

    if (!documentOneText.trim() || !documentTwoText.trim()) {
      setLoading(false);
      toast({
        title: "Document text unavailable",
        description: "One or both selected documents have no readable text.",
        variant: "destructive",
      });
      return;
    }

    const result = await compareDocumentsAction({
      documentOneText,
      documentTwoText,
      documentOneName: doc1.fileName,
      documentTwoName: doc2.fileName,
    });

    setLoading(false);
    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setComparisonResult(result.data);
    toast({
      title: "Comparison Complete",
      description: `Successfully compared documents.`,
    });
  };

  const canGenerate =
    selectedDoc1Id && selectedDoc2Id && selectedDoc1Id !== selectedDoc2Id;

  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
          Compare Documents
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">Compare two files side by side.</p>
      </div>

      <Card className="border-primary/20 bg-card/80 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b border-primary/10">
          <CardTitle className="text-2xl">Generate Comparison</CardTitle>
          <CardDescription className="text-sm mt-1">Pick two documents and compare them side by side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDocs ? (
            <div className="flex items-center space-x-3 animate-in fade-in">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading your documents...</span>
            </div>
          ) : documents && documents.length > 1 ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select onValueChange={setSelectedDoc1Id} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document one" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents
                      .filter((doc) => doc.id !== selectedDoc2Id)
                      .map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.fileName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setSelectedDoc2Id} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document two" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents
                      .filter((doc) => doc.id !== selectedDoc1Id)
                      .map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.fileName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading || !canGenerate}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Compare Documents
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>
                You need at least two documents to use the comparison feature.
              </p>
              <p className="text-sm mt-1">
                Upload more documents to get started.
              </p>
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
                Comparing documents... this may take a moment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparisonResult && !loading && (
        <Card className="relative overflow-hidden border-primary/20 bg-card/80 shadow-xl animate-in fade-in duration-500" style={{ animationDelay: "100ms" }}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,hsl(var(--accent)/0.08),transparent,hsl(var(--primary)/0.08))]" />
          <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b border-primary/10">
            <CardTitle className="text-2xl">Comparison Results</CardTitle>
            <CardDescription>
              Detailed analysis of similarities and differences between the selected documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-8 pt-8">
            {typeof comparisonResult.similarityScore === "number" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="font-semibold text-lg mb-1">Similarity Score</h3>
                <p className="text-2xl font-bold text-primary">
                  {(comparisonResult.similarityScore * 100).toFixed(1)}%
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                Similarities
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                {comparisonResult.similarities.map((item, index) => (
                  <li key={`sim-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <Separator />
            {comparisonResult.similarSections && comparisonResult.similarSections.length > 0 && (
              <>
                <div>
                  <h3 className="font-semibold text-lg mb-3">Most Similar Sections</h3>
                  <div className="space-y-3">
                    {comparisonResult.similarSections.map((item, index) => (
                      <div key={`similar-sec-${index}`} className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Match {(item.score * 100).toFixed(1)}%</p>
                        <p className="text-sm"><span className="font-medium">Doc 1:</span> {item.doc1}</p>
                        <p className="text-sm mt-1"><span className="font-medium">Doc 2:</span> {item.doc2}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {comparisonResult.differentSections && comparisonResult.differentSections.length > 0 && (
              <>
                <div>
                  <h3 className="font-semibold text-lg mb-3">Most Different Sections</h3>
                  <div className="space-y-3">
                    {comparisonResult.differentSections.map((item, index) => (
                      <div key={`different-sec-${index}`} className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Similarity {(item.score * 100).toFixed(1)}%</p>
                        <p className="text-sm"><span className="font-medium">Doc 1:</span> {item.doc1}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-yellow-500">
                <XCircle className="h-5 w-5" />
                Differences
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                {comparisonResult.differences.map((item, index) => (
                  <li key={`diff-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Conclusion</h3>
              <p className="text-muted-foreground">
                {comparisonResult.conclusion}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!comparisonResult && !loading && (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl border-accent/20 bg-gradient-to-br from-accent/10 to-primary/5 animate-in fade-in duration-500" style={{ animationDelay: "200ms" }}>
          <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mt-4">
            Your comparison will appear here
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Select two different documents above and click "Compare Documents" to start your analysis.
          </p>
        </div>
      )}
    </div>
  );
}
