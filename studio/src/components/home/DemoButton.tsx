"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DemoButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleDemo = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Anonymous sign-in failed:", error);
      toast({
        title: "Demo Failed",
        description: "Could not start the demo. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button size="lg" variant="outline" onClick={handleDemo} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Starting Demo...
        </>
      ) : (
        "View Demo"
      )}
    </Button>
  );
}
