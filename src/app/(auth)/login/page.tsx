import { LoginForm } from "@/components/auth/LoginForm";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <Link href="/" className="flex items-center justify-center gap-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2 text-primary shadow-md shadow-primary/20">
              <BrainCircuit className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">SummarAIze</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-6">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to continue your AI workspace</p>
      </div>
      <LoginForm />
      <p className="px-8 text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
