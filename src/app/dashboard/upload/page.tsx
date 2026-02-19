import { FileUpload } from "@/components/dashboard/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Increased to 300 seconds (5 minutes) to handle large documents (100+ pages)
export const maxDuration = 300;

export default function UploadPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          📄 Upload Document
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Upload PDFs or Word files (up to 300MB) to generate summaries, chat, analyze tone, and compare documents.
        </p>
      </div>

      <div className="flex justify-center">
        <Card className="w-full max-w-2xl border-primary/20 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <span>✨</span> New Document
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                    Drag and drop a file or click to select (PDF, DOCX, up to 300MB)
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <FileUpload />
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
