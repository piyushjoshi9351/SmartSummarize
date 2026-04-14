"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc } from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "../ui/card";

const passwordRequirements = {
  minLength: 8,
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
};

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(passwordRequirements.minLength, {
      message: `Password must be at least ${passwordRequirements.minLength} characters.`,
    })
    .regex(passwordRequirements.regex, {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
});

function getRegistrationErrorMessage(error: unknown): {
  message: string;
  field?: "email" | "password";
} {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";

  switch (code) {
    case "auth/email-already-in-use":
      return {
        message: "An account with this email already exists. Try signing in instead.",
        field: "email",
      };
    case "auth/invalid-email":
      return { message: "Please enter a valid email address.", field: "email" };
    case "auth/weak-password":
      return {
        message: "Password is too weak. Use a stronger password.",
        field: "password",
      };
    default:
      return { message: "Unable to create your account right now. Please try again." };
  }
}

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.name,
      });

      const userRef = doc(firestore, "users", user.uid);
      setDocumentNonBlocking(userRef, {
        id: user.uid,
        email: user.email,
        displayName: values.name,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      router.push("/dashboard");
    } catch (error: unknown) {
      const { message, field } = getRegistrationErrorMessage(error);

      if (field) {
        form.setError(field, { type: "manual", message });
      }

      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-card/85 shadow-xl shadow-primary/10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 pt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="bg-background/70 border-border/70" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" className="bg-background/70 border-border/70" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="bg-background/70 border-border/70" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-2">
                    Password must be at least {passwordRequirements.minLength} characters and include uppercase, lowercase, a number, and a special character.
                  </p>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
