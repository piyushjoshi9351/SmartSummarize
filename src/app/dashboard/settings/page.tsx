import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Settings</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Manage your account and application settings.
        </p>
      </div>

      <Card className="border-primary/20 bg-card/80 shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-primary/10">
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Account settings are not yet implemented.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-16 rounded-2xl border border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
              <User className="mx-auto h-12 w-12 text-muted-foreground/70" />
                <h3 className="text-lg font-semibold mt-4">Coming Soon</h3>
                <p className="text-muted-foreground mt-2">
                    We are working on adding account management features.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
