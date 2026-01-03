import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Activity, Plus, Search, Phone, Mail, Calendar, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_TYPES = {
  call: { icon: Phone, color: "bg-blue-500/20 text-blue-700 border-blue-300", label: "Call" },
  email: { icon: Mail, color: "bg-purple-500/20 text-purple-700 border-purple-300", label: "Email" },
  meeting: { icon: Calendar, color: "bg-green-500/20 text-green-700 border-green-300", label: "Meeting" },
  note: { icon: FileText, color: "bg-orange-500/20 text-orange-700 border-orange-300", label: "Note" },
};

export default function Activities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Mock data for demonstration
  const activities = [
    {
      id: 1,
      type: "call" as const,
      title: "Call with Sarah Johnson",
      description: "Discussed pricing and implementation timeline",
      contact: "Sarah Johnson",
      company: "Tech Solutions Inc",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      duration: 30,
      outcome: "Interested",
    },
    {
      id: 2,
      type: "email" as const,
      title: "Sent proposal to Mike Chen",
      description: "Sent custom proposal for digital marketing services",
      contact: "Mike Chen",
      company: "Digital Marketing Pro",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: 3,
      type: "meeting" as const,
      title: "Meeting with Emma Davis",
      description: "Onboarding meeting and project kickoff",
      contact: "Emma Davis",
      company: "Creative Agency",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      duration: 60,
      outcome: "Completed",
    },
    {
      id: 4,
      type: "note" as const,
      title: "Follow-up reminder",
      description: "Need to follow up on proposal by end of week",
      contact: "John Smith",
      company: "Enterprise Corp",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 5,
      type: "call" as const,
      title: "Call with John Smith",
      description: "Initial discovery call about requirements",
      contact: "John Smith",
      company: "Enterprise Corp",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      duration: 45,
      outcome: "Qualified",
    },
  ];

  const filteredActivities = activities.filter(activity => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || activity.type === filterType;
    return matchesSearch && matchesType;
  });

  const activityStats = {
    total: activities.length,
    calls: activities.filter(a => a.type === "call").length,
    emails: activities.filter(a => a.type === "email").length,
    meetings: activities.filter(a => a.type === "meeting").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Activities</h1>
          <p className="text-muted-foreground mt-2">Track all your interactions and follow-ups</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <select className="w-full px-3 py-2 border border-border rounded">
                <option>Select activity type</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
              </select>
              <Input placeholder="Select contact" />
              <Input placeholder="Activity title" />
              <textarea placeholder="Description" className="w-full px-3 py-2 border border-border rounded min-h-[100px]" />
              <Button className="w-full">Log Activity</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">{activityStats.total}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Activities</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">{activityStats.calls}</div>
            <p className="text-sm text-muted-foreground mt-1">Calls</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">{activityStats.emails}</div>
            <p className="text-sm text-muted-foreground mt-1">Emails</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">{activityStats.meetings}</div>
            <p className="text-sm text-muted-foreground mt-1">Meetings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "call", "email", "meeting", "note"].map(type => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              onClick={() => setFilterType(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No activities found</p>
          </div>
        ) : (
          filteredActivities.map((activity) => {
            const ActivityIcon = ACTIVITY_TYPES[activity.type].icon;
            return (
              <Card
                key={activity.id}
                className="brutalist-card bg-card hover:bg-card/80 transition-colors"
              >
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${ACTIVITY_TYPES[activity.type].color} border-2`}>
                        <ActivityIcon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-display font-bold text-foreground">{activity.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {activity.contact} • {activity.company}
                          </p>
                        </div>
                        <Badge className={`${ACTIVITY_TYPES[activity.type].color} border-2 capitalize`}>
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{activity.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
                        {activity.duration && <span>Duration: {activity.duration} min</span>}
                        {activity.outcome && <span>Outcome: {activity.outcome}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
