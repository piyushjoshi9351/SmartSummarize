"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection } from "firebase/firestore";
import { Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SummaryItem {
  id: string;
  documentName: string;
  audience: string;
  summaryText: string;
  generationDate: string;
}

export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedSummary, setSelectedSummary] = useState<SummaryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const summariesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/summaries`);
  }, [firestore, user]);

  const { data: history, isLoading, error } = useCollection(summariesQuery);

  const handleViewSummary = (item: SummaryItem) => {
    setSelectedSummary(item);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-primary bg-clip-text text-transparent">
          📚 Summary History
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Review and explore all your previously generated summaries in one place.
        </p>
      </div>

      <Card className="border-primary/20 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader className="bg-gradient-to-r from-blue-500/5 to-primary/5 border-b border-primary/10">
          <CardTitle className="text-2xl">✨ Saved Summaries</CardTitle>
          <CardDescription className="text-sm mt-1">
            All the summaries you have generated across your documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16 animate-in fade-in">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Loading your summaries...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold text-red-600">Unable to Load History</h3>
              <p className="text-muted-foreground mt-2">
                {error.message || 'Permission denied or an error occurred while fetching your summaries.'}
              </p>
              <p className="text-xs text-gray-500 mt-4">
                Error details: {error instanceof Error ? error.message : String(error)}
              </p>
            </div>
          ) : history && history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-primary/10">
                  <TableHead className="font-semibold">Document</TableHead>
                  <TableHead className="font-semibold">Audience</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="w-[40%] font-semibold">Summary</TableHead>
                  <TableHead className="text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item: any, idx: number) => (
                  <TableRow key={item.id} className="border-primary/5 hover:bg-primary/5 transition-colors duration-200 animate-in fade-in slide-in-from-left" style={{ animationDelay: `${idx * 50}ms` }}>
                    <TableCell className="font-medium text-primary">
                      {item.documentName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="hover:bg-primary/10 transition-colors duration-200">{item.audience}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.generationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {item.summaryText}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSummary(item)}
                        className="gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 animate-in fade-in duration-500">
              <h3 className="text-lg font-semibold">📚 No History Found</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                You haven&apos;t saved any summaries yet. Generate a summary from a document and save it to see it here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSummary?.documentName}</DialogTitle>
            <DialogDescription>
              Generated for {selectedSummary?.audience} on{" "}
              {selectedSummary &&
                new Date(selectedSummary.generationDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedSummary?.audience}</Badge>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap break-words">
                {selectedSummary?.summaryText}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
