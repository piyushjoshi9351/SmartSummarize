import { RegisterForm } from "@/components/auth/RegisterForm";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="flex items-center justify-center gap-2">
            <BrainCircuit className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">SummarAIze</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-6">Create an account</h1>
        <p className="text-muted-foreground">Enter your details below to create your account</p>
      </div>
      <RegisterForm />
      <p className="px-8 text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
