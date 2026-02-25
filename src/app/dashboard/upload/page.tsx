import { FileUpload } from "@/components/dashboard/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Increased to 300 seconds (5 minutes) to handle large documents (100+ pages)
export const maxDuration = 300;

export default function UploadPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Upload Document
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">Drop your file and launch the full AI workflow instantly.</p>
      </div>

      <div className="flex justify-center">
        <Card className="relative w-full max-w-2xl overflow-hidden border-primary/20 bg-card/80 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,hsl(var(--primary)/0.08),transparent,hsl(var(--accent)/0.1))]" />
            <CardHeader className="relative bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10">
                <CardTitle className="text-2xl flex items-center gap-2">
                  New Document
                </CardTitle>
                <CardDescription className="text-sm mt-2">PDF, DOCX up to 300MB.</CardDescription>
            </CardHeader>
            <CardContent className="relative pt-8">
                <FileUpload />
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
