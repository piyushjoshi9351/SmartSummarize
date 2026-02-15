import { LoginForm } from "@/components/auth/LoginForm";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="flex items-center justify-center gap-2">
            <BrainCircuit className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">SummarAIze</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-6">Welcome back</h1>
        <p className="text-muted-foreground">Enter your email to sign in to your account</p>
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
