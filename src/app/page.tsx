import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  GitCompareArrows,
  MessagesSquare,
  PenTool,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const DemoButton = dynamic(
  () => import("@/components/home/DemoButton").then((mod) => ({ default: mod.DemoButton })),
  {
    loading: () => <div className="h-10 w-32 rounded-full bg-secondary/70 animate-pulse" />,
  }
);

export default function Home() {
  const features = [
    {
      icon: BrainCircuit,
      title: "Smart Summaries",
      description: "Instant clean summaries.",
    },
    {
      icon: MessagesSquare,
      title: "AI Chat",
      description: "Ask and get direct answers.",
    },
    {
      icon: Share2,
      title: "Mind Map",
      description: "Visualize ideas quickly.",
    },
    {
      icon: PenTool,
      title: "Tone Analysis",
      description: "Check writing tone fast.",
    },
    {
      icon: ShieldCheck,
      title: "Private & Secure",
      description: "Your docs stay protected.",
    },
    {
      icon: GitCompareArrows,
      title: "Compare Docs",
      description: "Find key differences fast.",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">SummarAIze</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Hybrid AI Lab</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="rounded-full px-6">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-[-15%] top-[-30%] h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl motion-safe:animate-float-slow" />
            <div className="absolute right-[-10%] top-[10%] h-[360px] w-[360px] rounded-full bg-accent/20 blur-3xl motion-safe:animate-float-fast" />
            <div className="absolute bottom-[-30%] left-[15%] h-[420px] w-[420px] rounded-full bg-secondary/60 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(249,115,22,0.1),rgba(14,116,144,0.08))] bg-[length:200%_200%] motion-safe:animate-shimmer" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.18),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.12),transparent_50%)]" />
          </div>

          <div className="container mx-auto grid gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pt-24">
            <div className="space-y-8 motion-safe:animate-rise">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                SmartDoc AI
              </div>
              <div className="space-y-5">
                <h1 className="font-headline text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Upload any document,
                  <span className="text-primary"> SmartDoc AI explains it instantly</span>.
                </h1>
                <p className="max-w-xl text-base text-muted-foreground">
                  Upload a PDF and get summaries, chat, comparison, and analysis in one workspace.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button size="lg" asChild className="rounded-full px-8">
                  <Link href="/register">
                    Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <DemoButton />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground sm:grid-cols-4">
                {[
                  { label: "Summaries", value: "8s" },
                  { label: "AI Mode", value: "Hybrid" },
                  { label: "Privacy", value: "Encrypted" },
                  { label: "Docs", value: "PDF / DOCX" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative motion-safe:animate-rise">
              <div className="pointer-events-none absolute -top-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 top-1/2 hidden -translate-y-1/2 lg:block">
                <div className="relative motion-safe:animate-float-fast">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
                  <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-border/40 bg-card/40 text-primary/70 backdrop-blur-sm">
                    <Bot className="h-28 w-28" />
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 p-8 shadow-2xl backdrop-blur-sm">
                <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(14,116,144,0.16),rgba(249,115,22,0.16),rgba(14,116,144,0.08))]" />
                <div className="relative flex items-center justify-between">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                    SmartDoc AI Robot
                  </span>
                  <span className="rounded-full bg-foreground/90 px-3 py-1 text-xs text-background">Online</span>
                </div>

                <div className="relative mt-8 flex flex-col items-center gap-6 text-center">
                  <div className="absolute -top-16 right-0 rounded-2xl border border-primary/30 bg-background/90 px-4 py-2 text-xs text-foreground shadow-lg motion-safe:animate-float-fast sm:text-sm">
                    <p className="font-medium">Upload any PDF, I’ll summarize it for you.</p>
                    <p className="text-muted-foreground">I’m SmartDoc AI 🤖</p>
                  </div>

                  <div className="relative flex h-40 w-40 items-center justify-center rounded-[2rem] border border-white/20 bg-foreground text-background shadow-xl motion-safe:animate-float-slow">
                    <div className="absolute inset-4 rounded-[1.25rem] border border-white/15" />
                    <Bot className="h-16 w-16" />
                    <span className="absolute left-1/2 top-10 h-2.5 w-2.5 -translate-x-6 rounded-full bg-accent motion-safe:animate-pulse" />
                    <span className="absolute left-1/2 top-10 h-2.5 w-2.5 translate-x-3 rounded-full bg-primary motion-safe:animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold">Hi! I’m SmartDoc Robot</h3>
                    <p className="text-sm text-muted-foreground">Your AI document assistant.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Core modules</p>
            <h2 className="font-headline text-3xl sm:text-4xl">Everything you need</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/60 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg motion-safe:animate-in motion-safe:fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <CardHeader className="relative flex-row items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-md shadow-primary/20">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="mt-0 text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(14,116,144,0.18),rgba(255,255,255,0.2),rgba(249,115,22,0.2))]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border/60 bg-background/80 p-8 text-center shadow-xl motion-safe:animate-in motion-safe:fade-in">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Ready to launch</p>
              <h2 className="mt-3 font-headline text-3xl sm:text-4xl">Try SmartDoc AI</h2>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild className="rounded-full px-8">
                  <Link href="/register">
                    Launch workspace <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-full" asChild>
                  <Link href="/login">Continue with account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>SummarAIze Hybrid AI Studio</p>
          <p>&copy; {new Date().getFullYear()} SummarAIze. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
