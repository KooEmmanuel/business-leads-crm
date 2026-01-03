import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { DealForm } from "@/components/DealForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DealEdit() {
  const [, params] = useRoute("/deals/:id/edit");
  const [, setLocation] = useLocation();
  const dealId = params?.id ? parseInt(params.id) : 0;

  const { data: deal, isLoading } = trpc.deals.get.useQuery(
    { id: dealId },
    { enabled: dealId > 0 }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">Loading deal...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Deal not found</p>
            <Button onClick={() => setLocation("/deals")} className="mt-4">
              Back to Deals
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/deals/${dealId}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deal
        </Button>

        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Edit Deal</h1>
          <p className="text-muted-foreground mt-2">Update deal information</p>
        </div>

        <DealForm
          deal={deal}
          onSuccess={() => setLocation(`/deals/${dealId}`)}
          onCancel={() => setLocation(`/deals/${dealId}`)}
        />
      </div>
    </DashboardLayout>
  );
}

