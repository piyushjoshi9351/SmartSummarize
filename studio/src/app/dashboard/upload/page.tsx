import { FileUpload } from "@/components/dashboard/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Increased to 300 seconds (5 minutes) to handle large documents (100+ pages)
export const maxDuration = 300;

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
        <p className="text-muted-foreground">
          Upload a new document to generate summaries and chat with it.
        </p>
      </div>

      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>New Document</CardTitle>
                <CardDescription>
                    Select a PDF or DOCX file from your computer.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FileUpload />
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
