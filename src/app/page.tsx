import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  GitCompareArrows,
  MessagesSquare,
  PenTool,
  Radar,
  Rocket,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
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
      title: "Audience-Specific Summaries",
      description: "Summaries tuned for students, legal teams, researchers, and anyone who needs clarity fast.",
    },
    {
      icon: MessagesSquare,
      title: "Conversational Document Chat",
      description: "Ask deep questions and get answers grounded in your document with instant context.",
    },
    {
      icon: Share2,
      title: "Mind Maps & Knowledge Graphs",
      description: "Turn dense reports into visual maps of themes, arguments, and supporting evidence.",
    },
    {
      icon: PenTool,
      title: "Tone & Style Diagnostics",
      description: "Understand how persuasive, formal, or critical the writing is at a glance.",
    },
    {
      icon: GitCompareArrows,
      title: "Compare Documents",
      description: "Spot overlaps and contradictions across contracts, research, or policy docs.",
    },
    {
      icon: ShieldCheck,
      title: "Private by Design",
      description: "Hybrid AI keeps sensitive data safe with local NLP and optional Gemini boosts.",
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
                Adaptive AI cockpit
              </div>
              <div className="space-y-5">
                <h1 className="font-headline text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Your documents,
                  <span className="text-primary"> decoded</span> by
                  <span className="text-accent"> intelligent robots</span>.
                </h1>
                <p className="text-lg text-muted-foreground">
                  SummarAIze turns dense reports into clear action. Hybrid AI combines fast local models with Gemini
                  brilliance to keep your insights sharp, private, and animated.
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
                  { label: "Hybrid Mode", value: "Local+Gemini" },
                  { label: "Privacy", value: "Encrypted" },
                  { label: "Docs", value: "PDF / DOCX" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
                    <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-6 left-6 rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.3em] text-background shadow-lg">
                Bot bay
              </div>
              <div className="grid gap-6">
                {["Atlas", "Pulse", "Echo"].map((bot, index) => (
                  <div
                    key={bot}
                    className={`relative rounded-3xl border border-border/60 bg-card/90 p-6 shadow-xl backdrop-blur-sm ${
                      index % 2 === 0
                        ? "motion-safe:animate-float-slow"
                        : "motion-safe:animate-float-fast"
                    }`}
                  >
                    <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(120deg,rgba(14,116,144,0.12),rgba(249,115,22,0.18),rgba(14,116,144,0.12))] opacity-40" />
                    <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      <span>{bot} Unit</span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Active</span>
                    </div>
                    <div className="relative mt-5 flex items-center gap-4">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
                        <div className="absolute inset-2 rounded-xl border border-white/15" />
                        <div className="flex gap-2">
                          <span className="h-3 w-3 rounded-full bg-accent motion-safe:animate-pulse" />
                          <span className="h-3 w-3 rounded-full bg-primary motion-safe:animate-pulse" />
                        </div>
                        <span className="absolute -bottom-3 left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-foreground/80" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{bot}</p>
                        <p className="text-sm text-muted-foreground">
                          {index === 0 && "Summaries + Context"}
                          {index === 1 && "Tone + Highlights"}
                          {index === 2 && "Comparisons + Maps"}
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-6 h-24 overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.12),transparent_60%)]" />
                      <div className="absolute left-4 top-3 h-2 w-20 rounded-full bg-foreground/80" />
                      <div className="absolute left-4 top-7 h-2 w-32 rounded-full bg-foreground/30" />
                      <div className="absolute left-4 top-11 h-2 w-24 rounded-full bg-foreground/50" />
                      <div className="absolute inset-0 translate-y-[-40%] bg-[linear-gradient(transparent,rgba(14,116,144,0.25),transparent)] motion-safe:animate-scan" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Core modules</p>
            <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl">An animated suite of AI tools</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Every tool is a robot teammate designed to read faster, analyze deeper, and share insights that stick.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/60 bg-card/80 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-xl"
              >
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                <CardHeader className="relative flex-row items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-md shadow-primary/20">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="mt-0 text-xl">{feature.title}</CardTitle>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Module 0{index + 1}</p>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <p className="text-muted-foreground">{feature.description}</p>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Live in hybrid mode
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden bg-secondary/40 py-20">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,rgba(14,116,144,0.12),transparent,rgba(249,115,22,0.15))]" />
          <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
              <h3 className="font-headline text-3xl sm:text-4xl">Three steps, zero friction</h3>
              <p className="text-muted-foreground">
                Upload your document, choose a robot tool, and receive structured intelligence with citations and
                visuals. Everything is animated to show progress and momentum.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Upload", "Analyze", "Export"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs uppercase tracking-[0.25em]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-5">
              {[
                {
                  icon: UploadCloud,
                  title: "Upload your document",
                  desc: "Drag PDFs, DOCX, or research dumps. We extract and prep the text instantly.",
                },
                {
                  icon: Radar,
                  title: "Pick a robot tool",
                  desc: "Summaries, Q&A, mind maps, audio, and comparisons all run in parallel.",
                },
                {
                  icon: Rocket,
                  title: "Ship insights fast",
                  desc: "Export summaries, share dashboards, and keep every insight organized.",
                },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-md motion-safe:animate-rise"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Robot crew</p>
              <h3 className="font-headline text-3xl sm:text-4xl">Meet the insight bots</h3>
              <p className="text-muted-foreground">
                Each robot is purpose-built: summaries, tone diagnostics, and contrast analysis. Watch them animate as
                they crunch your content.
              </p>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/register">Deploy a bot now</Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { label: "Atlas Bot", note: "Summarization core", color: "bg-primary/15" },
                { label: "Pulse Bot", note: "Tone + sentiment", color: "bg-accent/20" },
                { label: "Echo Bot", note: "Q&A + retrieval", color: "bg-secondary/80" },
                { label: "Orbit Bot", note: "Comparisons + maps", color: "bg-primary/10" },
              ].map((bot) => (
                <div
                  key={bot.label}
                  className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 p-6 shadow-lg"
                >
                  <div className={`absolute right-4 top-4 h-16 w-16 rounded-full ${bot.color}`} />
                  <Bot className="h-8 w-8 text-foreground" />
                  <h4 className="mt-4 text-xl font-semibold">{bot.label}</h4>
                  <p className="text-sm text-muted-foreground">{bot.note}</p>
                  <div className="mt-6 h-2 w-full rounded-full bg-border/70">
                    <div className="h-2 w-2/3 rounded-full bg-primary motion-safe:animate-glow" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(14,116,144,0.18),rgba(255,255,255,0.2),rgba(249,115,22,0.2))]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border/60 bg-background/80 p-10 text-center shadow-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Ready to launch</p>
              <h2 className="mt-4 font-headline text-3xl sm:text-4xl">Bring your documents to life</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                SummarAIze ships with animated dashboards, robot assistants, and hybrid AI you can trust.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
