export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl motion-safe:animate-float-slow" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl motion-safe:animate-float-fast" />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,hsl(var(--primary)/0.08),transparent,hsl(var(--accent)/0.1))] bg-[length:200%_200%] motion-safe:animate-shimmer" />
      </div>
      <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/75 p-6 shadow-2xl shadow-primary/10 backdrop-blur-md sm:p-8">
        {children}
      </div>
    </div>
  );
}
