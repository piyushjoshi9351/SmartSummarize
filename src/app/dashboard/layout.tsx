"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { UserNav } from "@/components/dashboard/UserNav";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading: loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/50 bg-background/70 px-4 backdrop-blur-xl sm:h-auto sm:px-6">
          <div className="flex-1" />
          <UserNav />
        </header>
        <main className="relative flex-1 overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl motion-safe:animate-float-slow" />
            <div className="absolute right-0 top-32 h-56 w-56 rounded-full bg-accent/15 blur-3xl motion-safe:animate-float-fast" />
            <div className="absolute inset-0 bg-[linear-gradient(130deg,hsl(var(--primary)/0.06),transparent,hsl(var(--accent)/0.08))] bg-[length:200%_200%] motion-safe:animate-shimmer" />
          </div>
          <div className="relative mx-auto w-full max-w-7xl rounded-3xl border border-border/60 bg-card/55 p-4 shadow-xl shadow-black/5 backdrop-blur-md sm:p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
