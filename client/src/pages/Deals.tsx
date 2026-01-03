import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, Plus, DollarSign, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Deal } from "../../../drizzle/schema";

const DEAL_STAGES = ["prospecting", "negotiation", "proposal", "won", "lost"] as const;

export default function Deals() {
  const { data: deals, isLoading } = trpc.deals.list.useQuery();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const dealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = (deals || []).filter(d => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  const totalPipeline = (deals || []).reduce((sum, deal) => {
    return sum + (deal.value ? parseFloat(deal.value.toString()) : 0);
  }, 0);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospecting":
        return "bg-blue-500/20 text-blue-700 border-blue-300";
      case "negotiation":
        return "bg-purple-500/20 text-purple-700 border-purple-300";
      case "proposal":
        return "bg-orange-500/20 text-orange-700 border-orange-300";
      case "won":
        return "bg-green-500/20 text-green-700 border-green-300";
      case "lost":
        return "bg-red-500/20 text-red-700 border-red-300";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Deals</h1>
          <p className="text-muted-foreground mt-2">Track your sales pipeline</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <input placeholder="Deal title" className="w-full px-3 py-2 border border-border rounded" />
              <input placeholder="Contact" className="w-full px-3 py-2 border border-border rounded" />
              <input placeholder="Deal value" type="number" className="w-full px-3 py-2 border border-border rounded" />
              <select className="w-full px-3 py-2 border border-border rounded">
                <option>Select stage</option>
                {DEAL_STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <Button className="w-full">Create Deal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">{(deals || []).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Deals</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">${totalPipeline.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Pipeline Value</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
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
        <div className="text-center py-12 text-muted-foreground">Loading deals...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-5 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => (
            <div key={stage} className="min-w-[300px]">
              <div className="mb-4">
                <h3 className="font-display font-bold capitalize text-foreground">
                  {stage}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dealsByStage[stage].length} deals
                </p>
              </div>
              <div className="space-y-3">
                {dealsByStage[stage].map(deal => (
                  <Card
                    key={deal.id}
                    className="brutalist-card bg-card cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <CardContent className="pt-4">
                      <h4 className="font-display font-bold text-foreground mb-2">{deal.title}</h4>
                      <div className="space-y-2">
                        {deal.value && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-accent" />
                            <span className="text-sm font-mono">${parseFloat(deal.value.toString()).toLocaleString()}</span>
                          </div>
                        )}
                        {deal.probability !== null && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-sm">{deal.probability}% probability</span>
                          </div>
                        )}
                        {deal.expectedCloseDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(deal.expectedCloseDate), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedDeal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Value</label>
                  <p className="text-foreground text-lg font-display">
                    ${selectedDeal.value ? parseFloat(selectedDeal.value.toString()).toLocaleString() : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stage</label>
                  <Badge className={`${getStageColor(selectedDeal.stage)} border-2 w-fit mt-1 capitalize`}>
                    {selectedDeal.stage}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Probability</label>
                  <p className="text-foreground">{selectedDeal.probability}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expected Close</label>
                  <p className="text-foreground">
                    {selectedDeal.expectedCloseDate
                      ? new Date(selectedDeal.expectedCloseDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
              {selectedDeal.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground whitespace-pre-wrap">{selectedDeal.description}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1">Update Stage</Button>
                <Button variant="outline" className="flex-1">Add Activity</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
