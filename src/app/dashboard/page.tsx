
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
      <div className="rounded-2xl border border-border/60 bg-card/70 text-card-foreground shadow-lg backdrop-blur-sm">
        <div className="p-10 text-center text-muted-foreground flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/70 text-card-foreground shadow-lg backdrop-blur-sm">
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
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
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
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary/80 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">All tools in one place.</p>
      </div>

      <Card className="relative overflow-hidden border-primary/20 bg-card/70 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-top duration-700">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,hsl(var(--primary)/0.12),transparent,hsl(var(--accent)/0.12))]" />
        <CardContent className="relative py-8">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">SmartDoc AI Workspace</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">Turn long documents into clear insights</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload a file once, then summarize, chat, compare, and analyze with a smooth animated workflow.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {actionCards.map((card, idx) => (
          <Card
            key={card.title}
            className="group relative overflow-hidden border-border/60 bg-card/80 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 cursor-pointer animate-in fade-in slide-in-from-bottom duration-500"
            style={{
              animationDelay: `${idx * 50}ms`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Link href={card.href} className="absolute inset-0 z-10" />
            <CardHeader className="flex flex-row items-center gap-4 relative z-[1]">
              <div className={`rounded-xl p-3 bg-secondary group-hover:scale-110 transition-transform duration-300 ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">{card.title}</CardTitle>
                <CardDescription className="text-sm">{card.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="relative z-[1]">
              <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                {card.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: "400ms" }}>
        <RecentDocuments />
      </div>
    </div>
  );
}
