import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Account settings are not yet implemented.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-16">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
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
