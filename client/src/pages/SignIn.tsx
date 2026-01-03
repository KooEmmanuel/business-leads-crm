import { SignIn } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader>
          <CardTitle className="text-2xl font-display">Welcome to Business Leads CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Manage your business leads, create deals, and track communications all in one place.
          </p>
          <div className="flex justify-center">
            <SignIn />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

