import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, MessageSquare } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border-4 border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-display">Welcome to Business Leads CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Manage your business leads, create deals, and track communications all in one place.
            </p>
            <Button className="w-full" size="lg">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back, {user?.name || "User"}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="brutalist-card bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Total Contacts</span>
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">+0 this month</p>
            </CardContent>
          </Card>

          <Card className="brutalist-card bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Active Deals</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-accent">0</div>
              <p className="text-xs text-muted-foreground mt-1">$0 pipeline</p>
            </CardContent>
          </Card>

          <Card className="brutalist-card bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Activities</span>
                <BarChart3 className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">This week</p>
            </CardContent>
          </Card>

          <Card className="brutalist-card bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Messages</span>
                <MessageSquare className="w-4 h-4 text-accent" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-accent">0</div>
              <p className="text-xs text-muted-foreground mt-1">Unread</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Sections */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Contacts */}
          <Card className="lg:col-span-2 border-4 border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Contacts</span>
                <Button variant="outline" size="sm">View All</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                No contacts yet. Start by importing leads or creating a new contact.
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-4 border-border bg-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                New Contact
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                New Deal
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
