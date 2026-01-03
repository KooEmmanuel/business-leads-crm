import { SignIn } from "@clerk/clerk-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, MessageSquare } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Fetch real statistics from the database
  const { data: contacts } = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: deals } = trpc.deals.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const totalContacts = contacts?.length || 0;
  const activeDeals = deals?.filter((d: any) => d.stage !== 'won' && d.stage !== 'lost').length || 0;
  const pipelineValue = deals?.reduce((sum: any, deal: any) => {
    if (deal.stage !== 'won' && deal.stage !== 'lost' && deal.value) {
      return sum + parseFloat(deal.value.toString());
    }
    return sum;
  }, 0) || 0;

  // Show loading state while Clerk is determining authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show sign-in card when we're certain user is not authenticated
  // (loading is false AND isAuthenticated is false)
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md shadow-lg">
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back, {user?.name || "User"}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Total Contacts</span>
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-primary">{totalContacts}</div>
              <p className="text-xs text-muted-foreground mt-1">Total contacts</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Active Deals</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-accent">{activeDeals}</div>
              <p className="text-xs text-muted-foreground mt-1">${pipelineValue.toLocaleString()} pipeline</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow bg-card">
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

          <Card className="shadow-sm hover:shadow-md transition-shadow bg-card">
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
          <Card className="lg:col-span-2 shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Contacts</span>
                <Button variant="secondary" size="sm">View All</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                No contacts yet. Start by importing leads or creating a new contact.
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-sm bg-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="secondary">
                <Users className="w-4 h-4 mr-2" />
                New Contact
              </Button>
              <Button className="w-full justify-start" variant="secondary">
                <TrendingUp className="w-4 h-4 mr-2" />
                New Deal
              </Button>
              <Button className="w-full justify-start" variant="secondary">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="secondary">
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
