import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, TrendingUp, Calendar, FileText, Clock, CheckCircle2, Trash2, Plus, Send, Phone, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

const DEAL_STAGES = ["prospecting", "negotiation", "proposal", "won", "lost"] as const;

export default function DealDetail() {
  const [, params] = useRoute("/deals/:id");
  const [, setLocation] = useLocation();
  const dealId = params?.id ? parseInt(params.id) : 0;
  const utils = trpc.useUtils();
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "note" as const,
    title: "",
    description: "",
  });
  const [followUpForm, setFollowUpForm] = useState({
    title: "",
    description: "",
    scheduledFor: "",
  });

  const { data: deal, isLoading } = trpc.deals.get.useQuery(
    { id: dealId },
    { enabled: dealId > 0 }
  );

  const { data: activities } = trpc.activities.list.useQuery(undefined, {
    enabled: !!deal,
    refetchInterval: 30000,
  });

  const dealActivities = activities?.filter(a => a.dealId === dealId) || [];

  const updateDealMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.get.invalidate({ id: dealId });
      utils.deals.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update deal: ${error.message}`);
    },
  });

  const createActivityMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast.success("Activity recorded");
      setIsActivityDialogOpen(false);
      setIsFollowUpDialogOpen(false);
      setActivityForm({ type: "note", title: "", description: "" });
      setFollowUpForm({ title: "", description: "", scheduledFor: "" });
    },
    onError: (error) => {
      toast.error(`Failed to record activity: ${error.message}`);
    },
  });

  const deleteDealMutation = trpc.deals.delete.useMutation({
    onSuccess: () => {
      toast.success("Deal deleted successfully");
      utils.deals.list.invalidate();
      setLocation("/deals");
    },
    onError: (error) => {
      toast.error(`Failed to delete deal: ${error.message}`);
    },
  });

  const syncExternalMutation = trpc.contacts.syncExternal.useMutation();

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospecting":
        return "bg-[#E0F7FF] text-[#1A4D7A] dark:bg-[#1A4D7A]/20 dark:text-[#5FCAE1]"; // Kwickflow bg-light with primary
      case "negotiation":
        return "bg-[#F3E8FF] text-[#6B21A8] dark:bg-[#6B21A8]/20 dark:text-[#C084FC]"; // VIP status colors
      case "proposal":
        return "bg-[#FED7AA] text-[#92400E] dark:bg-[#92400E]/20 dark:text-[#FED7AA]"; // Orange
      case "won":
        return "bg-[#DCFCE7] text-[#15803D] dark:bg-[#15803D]/20 dark:text-[#4ADE80]"; // Success green
      case "lost":
        return "bg-[#FEE2E2] text-[#991B1B] dark:bg-[#991B1B]/20 dark:text-[#FCA5A5]"; // Inactive red
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">Loading deal...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
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
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/deals")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Button>

        {/* Header Card */}
        <Card className="shadow-md bg-card border-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-display font-bold text-foreground mb-3">
                  {deal.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${getStageColor(deal.stage)}  capitalize border-none shadow-none`}>
                    {deal.stage}
                  </Badge>
                  {deal.value && (
                    <div className="flex items-center gap-2 text-2xl font-display font-bold text-primary">
                      <DollarSign className="w-6 h-6" />
                      {parseFloat(deal.value.toString()).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setLocation(`/deals/${dealId}/edit`)}>
                  Edit Deal
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{deal.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteDealMutation.mutate({ id: dealId })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deal Information Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Deal Metrics */}
          <Card className="shadow-sm bg-card border-none">
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Deal Metrics</h2>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">Deal Value</span>
                </div>
                <p className="text-foreground text-3xl font-display font-bold pl-6">
                  ${deal.value ? parseFloat(deal.value.toString()).toLocaleString() : "0"}
                  {deal.currency && <span className="text-lg text-muted-foreground ml-2">{deal.currency}</span>}
                </p>
              </div>

              {deal.probability !== null && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Probability</span>
                  </div>
                  <div className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-secondary/20 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-foreground font-bold">{deal.probability}%</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Stage</span>
                </div>
                <Badge className={`${getStageColor(deal.stage)}  capitalize ml-6 border-none shadow-none`}>
                  {deal.stage}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="shadow-sm bg-card border-none">
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Timeline</h2>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-foreground pl-6">
                  {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
                </p>
              </div>

              {deal.expectedCloseDate && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Expected Close Date</span>
                  </div>
                  <p className="text-foreground pl-6">
                    {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground pl-6">
                    ({formatDistanceToNow(new Date(deal.expectedCloseDate), { addSuffix: true })})
                  </p>
                </div>
              )}

              {deal.closedAt && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Closed</span>
                  </div>
                  <p className="text-foreground pl-6">
                    {new Date(deal.closedAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stage Progress */}
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-2xl font-display font-bold text-foreground">Pipeline Progress</h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {DEAL_STAGES.map((stage, index) => {
                const isCurrentStage = deal.stage === stage;
                const currentIndex = DEAL_STAGES.indexOf(deal.stage);
                const isPastStage = index < currentIndex;
                
                return (
                  <div key={stage} className="flex items-center flex-1 min-w-[120px]">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                          isCurrentStage
                            ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                            : isPastStage
                            ? "bg-accent/20 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-xs mt-2 font-medium capitalize text-center ${
                          isCurrentStage ? "text-primary font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                    {index < DEAL_STAGES.length - 1 && (
                      <div
                        className={`h-1 flex-1 mx-2 rounded transition-all ${
                          isPastStage ? "bg-accent/30" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {deal.description && (
          <Card className="shadow-sm bg-card border-none">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-5 h-5" />
                <h2 className="text-2xl font-display font-bold text-foreground">Description</h2>
              </div>
              <p className="text-foreground whitespace-pre-wrap pl-7">{deal.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Activities Section */}
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">Activities & Notes</h2>
            </div>
            {dealActivities.length > 0 ? (
              <div className="space-y-6">
                {dealActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      {activity.type === 'call' && <Phone className="w-4 h-4 text-accent" />}
                      {activity.type === 'email' && <Mail className="w-4 h-4 text-primary" />}
                      {activity.type === 'meeting' && <Calendar className="w-4 h-4 text-orange-500" />}
                      {activity.type === 'note' && <FileText className="w-4 h-4 text-gray-500" />}
                      {activity.type === 'task' && <Clock className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      {activity.scheduledFor && (
                        <p className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Scheduled for: {new Date(activity.scheduledFor).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No activities recorded for this deal yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="flex gap-3 flex-wrap">
              {/* Move to Next Stage */}
              <Button
                disabled={deal.stage === "won" || deal.stage === "lost" || updateDealMutation.isPending}
                onClick={() => {
                  const currentIndex = DEAL_STAGES.indexOf(deal.stage);
                  if (currentIndex < DEAL_STAGES.length - 1) {
                    const nextStage = DEAL_STAGES[currentIndex + 1];
                    updateDealMutation.mutate({
                      id: dealId,
                      stage: nextStage,
                    });
                    createActivityMutation.mutate({
                      type: "task",
                      title: `Moved deal to ${nextStage}`,
                      description: `The deal stage was updated from ${deal.stage} to ${nextStage}`,
                      dealId: dealId,
                      contactId: deal.contactId,
                    });
                    toast.success(`Moved to ${nextStage}`);
                  }
                }}
              >
                Move to Next Stage
              </Button>

              {/* Add Activity */}
              <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Add Activity</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Activity</DialogTitle>
                    <DialogDescription>
                      Record a past interaction for this deal.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Activity Type</Label>
                      <Select
                        value={activityForm.type}
                        onValueChange={(v: any) => setActivityForm({ ...activityForm, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="call">Call Log</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="e.g. Call with decision maker"
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Details of the activity..."
                        value={activityForm.description}
                        onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={createActivityMutation.isPending || !activityForm.title}
                      onClick={() => {
                        createActivityMutation.mutate({
                          ...activityForm,
                          dealId: dealId,
                          contactId: deal.contactId,
                        });
                      }}
                    >
                      {createActivityMutation.isPending ? "Saving..." : "Save Activity"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Schedule Follow-up */}
              <Dialog open={isFollowUpDialogOpen} onOpenChange={setIsFollowUpDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Schedule Follow-up</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Follow-up</DialogTitle>
                    <DialogDescription>
                      Set a reminder for a future task or meeting.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Task Title</Label>
                      <Input
                        placeholder="e.g. Send final contract"
                        value={followUpForm.title}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={followUpForm.scheduledFor}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledFor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Details</Label>
                      <Textarea
                        placeholder="Details of the follow-up..."
                        value={followUpForm.description}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, description: e.target.value })}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={createActivityMutation.isPending || !followUpForm.title || !followUpForm.scheduledFor}
                      onClick={() => {
                        createActivityMutation.mutate({
                          type: "task",
                          title: followUpForm.title,
                          description: followUpForm.description,
                          scheduledFor: followUpForm.scheduledFor,
                          dealId: dealId,
                          contactId: deal.contactId,
                        });
                      }}
                    >
                      {createActivityMutation.isPending ? "Scheduling..." : "Schedule"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Send Proposal */}
              <Button
                variant="secondary"
                disabled={deal.stage === "proposal" || deal.stage === "won" || deal.stage === "lost" || updateDealMutation.isPending}
                className="gap-2"
                onClick={() => {
                  updateDealMutation.mutate({
                    id: dealId,
                    stage: "proposal",
                  });
                  createActivityMutation.mutate({
                    type: "email",
                    title: "Sent Proposal",
                    description: "Proposal was sent to the client.",
                    dealId: dealId,
                    contactId: deal.contactId,
                  });
                  toast.success("Stage updated to Proposal");
                }}
              >
                <Send className="w-4 h-4" />
                Send Proposal
              </Button>

              {/* Mark as Won */}
              <Button
                variant="secondary"
                disabled={deal.stage === "won" || updateDealMutation.isPending}
                className="gap-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30"
                onClick={() => {
                  updateDealMutation.mutate({
                    id: dealId,
                    stage: "won",
                    closedAt: new Date().toISOString(),
                  });
                  createActivityMutation.mutate({
                    type: "task",
                    title: "Deal Won! 🎉",
                    description: "The deal has been successfully closed.",
                    dealId: dealId,
                    contactId: deal.contactId,
                  });
                  // Trigger sync to link with KwickFlow if they already exist there
                  syncExternalMutation.mutate();
                  toast.success("Congratulations! Deal marked as Won.");
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Won
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

