import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Plus, DollarSign, Calendar, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Deal } from "../../../drizzle/schema";
import { toast } from "sonner";
import { useState } from "react";

const DEAL_STAGES = ["prospecting", "negotiation", "proposal", "won", "lost"] as const;

export default function Deals() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [draggingDealId, setDraggingDealId] = useState<number | null>(null);

  const { data: deals, isLoading } = trpc.deals.list.useQuery();

  const updateDealMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to move deal: ${error.message}`);
    },
  });

  const createActivityMutation = trpc.activities.create.useMutation();
  const syncExternalMutation = trpc.contacts.syncExternal.useMutation();

  const dealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = (deals || []).filter(d => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  const totalPipeline = (deals || []).reduce((sum, deal) => {
    return sum + (deal.value ? parseFloat(deal.value.toString()) : 0);
  }, 0);

  const handleDragStart = (dealId: number) => {
    setDraggingDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-muted/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-muted/50");
  };

  const handleDrop = (e: React.DragEvent, newStage: typeof DEAL_STAGES[number]) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-muted/50");
    
    if (draggingDealId) {
      const deal = deals?.find(d => d.id === draggingDealId);
      if (deal && deal.stage !== newStage) {
        updateDealMutation.mutate({
          id: draggingDealId,
          stage: newStage,
          closedAt: newStage === "won" ? new Date().toISOString() : undefined,
        });

        createActivityMutation.mutate({
          type: "task",
          title: `Moved deal to ${newStage}`,
          description: `Deal "${deal.title}" was moved from ${deal.stage} to ${newStage} via drag and drop.`,
          dealId: deal.id,
          contactId: deal.contactId,
        });

        if (newStage === "won") {
          syncExternalMutation.mutate();
        }

        toast.success(`Moved to ${newStage}`);
      }
      setDraggingDealId(null);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospecting":
        return "bg-[#E0F7FF] text-[#1A4D7A]"; // Kwickflow bg-light with primary
      case "negotiation":
        return "bg-[#F3E8FF] text-[#6B21A8]"; // VIP status colors
      case "proposal":
        return "bg-[#FED7AA] text-[#92400E]"; // Orange
      case "won":
        return "bg-[#DCFCE7] text-[#15803D]"; // Success green
      case "lost":
        return "bg-[#FEE2E2] text-[#991B1B]"; // Inactive red
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Deals</h1>
          <p className="text-muted-foreground mt-2">Track your sales pipeline</p>
        </div>
        <Button className="gap-2" onClick={() => setLocation("/deals/create")}>
          <Plus className="w-4 h-4" />
          New Deal
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">{(deals || []).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Deals</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">${totalPipeline.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Pipeline Value</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">
              {dealsByStage.won.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Won Deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 pt-4 px-1 -mx-1 snap-x">
          {DEAL_STAGES.map(stage => (
            <div 
              key={stage} 
              className="min-w-[340px] w-[340px] flex flex-col h-full bg-secondary/5 dark:bg-white/[0.02] rounded-3xl p-6 transition-colors border border-border/40 dark:border-white/[0.05] snap-start"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <div>
                  <h3 className="font-display font-bold capitalize text-foreground flex items-center gap-3 text-xl tracking-tight">
                  {stage}
                    <Badge variant="secondary" className="h-6 px-2 text-xs bg-primary/10 text-primary border-none font-bold">
                      {dealsByStage[stage].length}
                    </Badge>
                </h3>
                </div>
              </div>
              <div className="space-y-4 flex-1 min-h-[500px]">
                {dealsByStage[stage].map(deal => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id)}
                    className={`shadow-sm bg-card dark:bg-muted/20 cursor-grab active:cursor-grabbing hover:shadow-xl hover:-translate-y-1 dark:hover:bg-muted/30 transition-all border border-transparent dark:border-white/[0.05] ${draggingDealId === deal.id ? 'opacity-40 scale-95' : ''}`}
                    onClick={() => setLocation(`/deals/${deal.id}`)}
                  >
                    <CardContent className="p-5 space-y-4">
                      <h4 className="font-display font-bold text-foreground leading-snug text-base group-hover:text-primary transition-colors">{deal.title}</h4>
                      <div className="space-y-3">
                        {deal.value && (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <DollarSign className="w-4 h-4 text-accent" />
                          </div>
                            <span className="text-lg font-bold text-primary dark:text-accent tracking-tight">${parseFloat(deal.value.toString()).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40 dark:border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground/60" />
                            <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                              {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {deal.probability !== null && (
                            <Badge variant="outline" className="text-[10px] h-5 px-2 border-primary/20 bg-primary/5 text-primary font-black">
                              {deal.probability}%
                            </Badge>
                        )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {dealsByStage[stage].length === 0 && (
                  <div className="h-32 border-2 border-dashed border-muted-foreground/10 dark:border-white/[0.03] rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/[0.01]">
                    <p className="text-sm text-muted-foreground/40 font-medium italic tracking-tight">Drop deal here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
