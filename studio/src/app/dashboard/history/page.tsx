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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Summary History</h1>
        <p className="text-muted-foreground">
          Review your previously generated summaries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Summaries</CardTitle>
          <CardDescription>
            Here are all the summaries you have saved across all your documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[40%]">Summary</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.documentName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.audience}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.generationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.summaryText}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSummary(item)}
                        className="gap-2"
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
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold">No History Found</h3>
              <p className="text-muted-foreground mt-2">
                You haven&apos;t saved any summaries yet. Generate a summary and
                save it to see it here.
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
