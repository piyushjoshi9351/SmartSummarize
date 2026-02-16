
"use client";

import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { DocumentData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileUp,
  MessageSquare,
  Share2,
  PenTool,
  ArrowRight,
  Loader2,
  FileText,
  GitCompareArrows,
  BookCopy,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const actionCards = [
  {
    title: "Upload & Summarize",
    description: "Generate a summary for any audience.",
    icon: FileUp,
    href: "/dashboard/upload",
    color: "text-primary",
    cta: "Go to Upload",
  },
  {
    title: "Chat with Document",
    description: "Ask questions and get instant answers.",
    icon: MessageSquare,
    href: "/dashboard/upload",
    color: "text-accent",
    cta: "Go to Upload",
  },
  {
    title: "Compare Documents",
    description: "Analyze two files side-by-side.",
    icon: GitCompareArrows,
    href: "/dashboard/compare",
    color: "text-orange-500",
    cta: "Explore Feature",
  },
  {
    title: "Generate Mind Map",
    description: "Visualize key concepts and connections.",
    icon: Share2,
    href: "/dashboard/mind-map",
    color: "text-green-500",
    cta: "Explore Feature",
  },
  {
    title: "Analyze Tone & Style",
    description: "Understand the author's sentiment and voice.",
    icon: PenTool,
    href: "/dashboard/analysis",
    color: "text-yellow-500",
    cta: "Explore Feature",
  },
  {
    title: "View History",
    description: "Review all your past summaries.",
    icon: BookCopy,
    href: "/dashboard/history",
    color: "text-blue-500",
    cta: "Explore Feature",
  },
];

function RecentDocuments() {
  const { user } = useUser();
  const firestore = useFirestore();

  const docsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users", user.uid, "documents"),
      orderBy("uploadDate", "desc"),
      limit(5)
    );
  }, [firestore, user]);

  const { data: documents, isLoading } = useCollection<DocumentData>(docsQuery);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-10 text-center text-muted-foreground flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-10 text-center text-muted-foreground">
          <p className="font-medium">You have no recent documents.</p>
          <p className="text-sm mt-2">
            Upload a document using one of the actions above to get started.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/upload">Upload Document</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>
          Your 5 most recently uploaded documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{doc.fileName}</span>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {formatDistanceToNow(new Date(doc.uploadDate), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/document/${doc.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Let's turn your documents into insights.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {actionCards.map((card) => (
          <Card
            key={card.title}
            className="group relative transition-all duration-300 hover:border-primary/50 hover:shadow-primary/10 hover:shadow-lg hover:-translate-y-1"
          >
            <Link href={card.href} className="absolute inset-0 z-10" />
            <CardHeader className="flex flex-row items-center gap-4">
              <div className={`rounded-lg p-3 bg-secondary ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {card.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <RecentDocuments />
      </div>
    </div>
  );
}
