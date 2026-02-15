"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Volume2 } from "lucide-react";
import {
  generateSummaryAction,
  generateAudioSummaryAction,
} from "@/actions/documents";
import { useToast } from "@/hooks/use-toast";
import { DocumentData, SummaryData } from "@/lib/types";
import { useUser, useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";

const audiences = ["Student", "Lawyer", "Researcher", "General Public"] as const;
const languages = ["English", "Spanish", "French", "German", "Hindi"] as const;

const formSchema = z.object({
  audience: z.enum(audiences, {
    required_error: "Please select an audience.",
  }),
  language: z.enum(languages, {
    required_error: "Please select a language.",
  }),
});

export function SummaryView({ document }: { document: DocumentData }) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "English",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setSummary(null);
    setAudioSrc(null);
    const result = await generateSummaryAction({
      text: document.text,
      audience: values.audience,
      language: values.language,
    });
    setLoading(false);

    if (result.success && result.data) {
      setSummary({
        ...result.data,
        audience: values.audience,
        language: values.language,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to generate summary.",
        variant: "destructive",
      });
    }
  }

  const handleSave = async () => {
    if (!summary || !user || !firestore) return;
    setSaving(true);

    try {
      const summariesRef = collection(
        firestore,
        "users",
        user.uid,
        "summaries"
      );

      await addDocumentNonBlocking(summariesRef, {
        userId: user.uid,
        documentId: document.id,
        documentName: document.fileName,
        audience: summary.audience,
        summaryText: summary.summary.join("\n"),
        citations: summary.citations || [],
        generationDate: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "Your summary has been saved to your history.",
      });
    } catch (error) {
      console.error("Error saving summary:", error);
      toast({
        title: "Error",
        description: "Could not save summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleListen = async () => {
    if (!summary) return;
    setIsGeneratingAudio(true);
    setAudioSrc(null);

    const result = await generateAudioSummaryAction({ text: summary.summary.join("\n") });

    setIsGeneratingAudio(false);
    if (result.success && result.data) {
      setAudioSrc(result.data.audioDataUri);
    } else {
      toast({
        title: "Audio Generation Failed",
        description:
          result.error || "Could not generate audio for the summary.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate AI Summary</CardTitle>
        <CardDescription>
          Select an audience and language to tailor the summary.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {audiences.map((audience) => (
                          <SelectItem key={audience} value={audience}>
                            {audience}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Summary
            </Button>
          </CardFooter>
        </form>
      </Form>

      {loading && (
        <div className="px-6 pb-6">
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div>
          </div>
        </div>
      )}

      {summary && (
        <div className="border-t">
          <CardHeader>
            <CardTitle>
              Summary for a {summary.audience} in {summary.language}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="prose prose-sm dark:prose-invert max-w-none list-disc pl-5 space-y-2">
              {summary.summary.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>

            {summary.citations && summary.citations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Citations</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {summary.citations.map((citation, index) => (
                    <p key={index}>
                      - Page {citation.page}, Paragraph {citation.paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save to History
            </Button>
            <Button
              onClick={handleListen}
              disabled={isGeneratingAudio}
              variant="outline"
            >
              {isGeneratingAudio ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="mr-2 h-4 w-4" />
              )}
              Listen to Summary
            </Button>
          </CardFooter>
          {audioSrc && (
            <CardContent>
              <audio controls src={audioSrc} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </CardContent>
          )}
        </div>
      )}
    </Card>
  );
}
