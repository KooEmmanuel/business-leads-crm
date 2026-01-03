import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { DealForm } from "@/components/DealForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DealCreate() {
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation("/deals")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Button>

        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Create New Deal</h1>
          <p className="text-muted-foreground mt-2">Add a new deal to your pipeline</p>
        </div>

        <DealForm
          onSuccess={() => setLocation("/deals")}
          onCancel={() => setLocation("/deals")}
        />
      </div>
    </DashboardLayout>
  );
}

