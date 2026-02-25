import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'SummarAIze',
  description: 'Smart AI Document Summarizer & Chat System',
};

// Cache static assets for 1 year
export const revalidate = 3600; // Revalidate every hour for dynamic needs

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Preload critical assets */}
        <link
          rel="prefetch"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 -z-10">
              <div className="absolute inset-0 bg-background" />
              <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl motion-safe:animate-float-slow" />
              <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl motion-safe:animate-float-fast" />
              <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-secondary/40 blur-3xl motion-safe:animate-float-slow" />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,hsl(var(--primary)/0.10),transparent,hsl(var(--accent)/0.10))] bg-[length:220%_220%] motion-safe:animate-shimmer" />
            </div>
            {children}
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
