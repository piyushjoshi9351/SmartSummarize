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
import { collection } from "firebase/firestore";
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

    const result = await compareDocumentsAction({
      documentOneText: doc1.text,
      documentTwoText: doc2.text,
      documentOneName: doc1.fileName,
      documentTwoName: doc2.fileName,
    });

    setLoading(false);
    if (result.success && result.data) {
      setComparisonResult(result.data);
      toast({
        title: "Comparison Complete",
        description: `Successfully compared documents.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to compare documents.",
        variant: "destructive",
      });
    }
  };

  const canGenerate =
    selectedDoc1Id && selectedDoc2Id && selectedDoc1Id !== selectedDoc2Id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compare Documents</h1>
        <p className="text-muted-foreground">
          Analyze two documents side-by-side to find similarities and
          differences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Comparison</CardTitle>
          <CardDescription>
            Select two different documents to run a comparative analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDocs ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading documents...</span>
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Comparing documents... this can take a moment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparisonResult && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
            <CardDescription>
              Analysis of similarities and differences between the selected
              documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold mt-4">
            Your comparison will appear here
          </h3>
          <p className="text-muted-foreground mt-2">
            Select two documents and click "Compare" to start.
          </p>
        </div>
      )}
    </div>
  );
}
