import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ContactImportDialog } from "@/components/ContactImportDialog";
import { Users, Search, Plus, Mail, Phone, MapPin, Calendar, RefreshCw, X, Building2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Contact } from "../../../drizzle/schema";

export default function Contacts() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated && !authLoading, // Only query when authenticated
    refetchInterval: 300000, // Refresh and auto-sync every 5 minutes
  });

  const syncExternalMutation = trpc.contacts.syncExternal.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} businesses from KwickFlow`);
      utils.contacts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    type: "individual" as "individual" | "company",
  });

  const createContactMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created successfully");
      utils.contacts.list.invalidate();
      setIsCreateDialogOpen(false);
      setNewContactForm({ name: "", email: "", phone: "", company: "", type: "individual" });
    },
    onError: (error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactForm.name) {
      toast.error("Contact name is required");
      return;
    }
    createContactMutation.mutate(newContactForm);
  };

  const categories = Array.from(new Set((contacts || []).map((c: any) => c.category).filter(Boolean))) as string[];

  const filteredContacts = (contacts || []).filter((contact: any) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    const matchesType = typeFilter === "all" || contact.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || contact.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "customer":
        return "bg-[#DCFCE7] text-[#15803D] dark:bg-[#15803D]/20 dark:text-[#4ADE80]"; // Active status
      case "lead":
        return "bg-[#E0F7FF] text-[#1A4D7A] dark:bg-[#1A4D7A]/20 dark:text-[#5FCAE1]"; // Kwickflow primary
      case "prospect":
        return "bg-[#FEF3C7] text-[#92400E] dark:bg-[#92400E]/20 dark:text-[#FCD34D]"; // Yellow prospect
      case "inactive":
        return "bg-[#FEE2E2] text-[#991B1B] dark:bg-[#991B1B]/20 dark:text-[#FCA5A5]"; // Inactive status
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-2">Manage your business leads and customers</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => syncExternalMutation.mutate()}
            disabled={syncExternalMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${syncExternalMutation.isPending ? "animate-spin" : ""}`} />
            Sync KwickFlow
          </Button>
          <ContactImportDialog />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateContact} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Contact Type</Label>
                  <Select 
                    value={newContactForm.type} 
                    onValueChange={(v: any) => setNewContactForm({ ...newContactForm, type: v })}
                  >
                    <SelectTrigger className="h-10 bg-muted/50 border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual / Person</SelectItem>
                      <SelectItem value="company">Company / Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    placeholder={newContactForm.type === 'company' ? "e.g. Salon Tesio" : "Contact name"} 
                    value={newContactForm.name}
                    onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                    required
                    className="h-10 bg-muted/50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    placeholder="Email" 
                    type="email" 
                    value={newContactForm.email}
                    onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                    className="h-10 bg-muted/50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    placeholder="Phone" 
                    value={newContactForm.phone}
                    onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                    className="h-10 bg-muted/50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input 
                    placeholder="Company" 
                    value={newContactForm.company}
                    onChange={(e) => setNewContactForm({ ...newContactForm, company: e.target.value })}
                    className="h-10 bg-muted/50 border-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending ? "Creating..." : "Create Contact"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid gap-4 md:grid-cols-12 items-end">
        <div className="md:col-span-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
            placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
        />
        </div>
        <div className="md:col-span-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
              <SelectItem value="individual">Individuals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-full"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTypeFilter("all");
              setCategoryFilter("all");
            }}
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">{(contacts || []).filter((c: any) => c.type === 'company').length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Companies</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">
              {(contacts || []).filter((c: any) => c.type === "individual").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Individuals</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">
              {(contacts || []).filter((c: any) => c.status === "customer").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Active Customers</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">
              {(contacts || []).filter((c: any) => c.status === "lead").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          filteredContacts.map((contact: any) => (
            <Card
              key={contact.id}
              className="shadow-sm bg-card hover:bg-card/80 cursor-pointer transition-colors border-none"
              onClick={() => setLocation(`/contacts/${contact.id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-1.5 rounded-md ${contact.type === 'company' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {contact.type === 'company' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <h3 className="text-lg font-display font-bold">{contact.name}</h3>
                      <Badge className={`${getStatusColor(contact.status)} border-none shadow-none`}>
                        {contact.status}
                      </Badge>
                      {contact.type === 'company' && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider opacity-70">Company</Badge>
                      )}
                    </div>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground mb-3">{contact.company}</p>
                    )}
                    <div className="space-y-2">
                      {contact.email && contact.email !== "Unknown" && contact.email !== "N/A" && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-primary" />
                          <a 
                            href={`mailto:${contact.email}`} 
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && contact.phone !== "Unknown" && contact.phone !== "N/A" && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-accent" />
                          <a 
                            href={`tel:${contact.phone}`} 
                            className="text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {contact.location}
                        </div>
                      )}
                      {contact.lastContactedAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Last contacted {formatDistanceToNow(new Date(contact.lastContactedAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/contacts/${contact.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
