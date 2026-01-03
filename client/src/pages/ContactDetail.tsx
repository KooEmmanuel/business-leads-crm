import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Globe, User, Users, Building2, Tag, FileText, Trash2, Send, RefreshCw, ShieldCheck, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function ContactDetail() {
  const [, params] = useRoute("/contacts/:id");
  const [, setLocation] = useLocation();
  const contactId = params?.id ? parseInt(params.id) : 0;
  const utils = trpc.useUtils();

  const { data: contact, isLoading } = trpc.contacts.get.useQuery(
    { id: contactId },
    { enabled: contactId > 0 }
  );

  const { data: relatedContacts } = trpc.contacts.getRelated.useQuery(
    { parentId: contactId },
    { enabled: !!contact && contact.type === 'company' }
  );

  const { data: parentContact } = trpc.contacts.get.useQuery(
    { id: contact?.parentId || 0 },
    { enabled: !!contact?.parentId }
  );

  const { data: bizData } = trpc.kwickflow.getBusinessByContactId.useQuery(
    { contactId },
    { enabled: !!contact?.externalId }
  );

  const { data: agents } = trpc.vapi.listAgents.useQuery();
  const { data: phoneNumbers } = trpc.vapi.listPhoneNumbers.useQuery();
  const { data: activities } = trpc.activities.getByContact.useQuery(
    { contactId },
    { 
      enabled: contactId > 0,
      refetchInterval: 30000, // Poll every 30s
    }
  );
  const { data: messages } = trpc.messages.getByContact.useQuery(
    { contactId },
    { 
      enabled: contactId > 0,
      refetchInterval: 30000, // Poll every 30s
    }
  );
  const { data: liveEmails } = trpc.email.list.useQuery(
    { email: contact?.email || undefined },
    { 
      enabled: !!contact?.email,
      refetchInterval: 30000, 
    }
  );

  const [messageText, setMessageText] = useState("");

  const callMutation = trpc.vapi.initiateCall.useMutation({
    onSuccess: () => {
      toast.success("Call initiated successfully");
      setIsCallDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to initiate call: ${error.message}`);
    },
  });

  const sendEmailMutation = trpc.email.send.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully");
      utils.messages.getByContact.invalidate({ contactId });
      utils.activities.getByContact.invalidate({ contactId });
      setIsEmailDialogOpen(false);
      setEmailForm({ subject: "", content: "" });
    },
    onError: (error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  const createDealMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      toast.success("Deal created successfully");
      utils.deals.list.invalidate();
      setIsDealDialogOpen(false);
      setDealForm({ title: "", description: "", value: 0, stage: "prospecting", expectedCloseDate: "" });
    },
    onError: (error) => {
      toast.error(`Failed to create deal: ${error.message}`);
    },
  });

  const createActivityMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast.success("Activity recorded successfully");
      utils.activities.getByContact.invalidate({ contactId });
      setIsActivityDialogOpen(false);
      setIsMeetingDialogOpen(false);
      setActivityForm({ type: "note", title: "", description: "", outcome: "" });
      setMeetingForm({ title: "", description: "", scheduledFor: "" });
    },
    onError: (error) => {
      toast.error(`Failed to record activity: ${error.message}`);
    },
  });

  const updateContactMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated successfully");
      utils.contacts.get.invalidate({ id: contactId });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });

  const deleteContactMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted successfully");
      setLocation("/contacts");
    },
    onError: (error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);

  const [emailForm, setEmailForm] = useState({
    subject: "",
    content: "",
  });
  const [dealForm, setDealForm] = useState({
    title: "",
    description: "",
    value: 0,
    stage: "prospecting" as const,
    expectedCloseDate: "",
  });
  const [activityForm, setActivityForm] = useState({
    type: "note" as const,
    title: "",
    description: "",
    outcome: "",
  });
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduledFor: "",
  });

  const [callOptions, setCallOptions] = useState({
    agentId: "",
    phoneNumberId: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    location: "",
    category: "",
    status: "prospect",
    type: "individual",
    notes: "",
    website: "",
    contactPerson: "",
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.company || "",
        location: contact.location || "",
        category: contact.category || "",
        status: contact.status || "prospect",
        type: contact.type || "individual",
        notes: contact.notes || "",
        website: contact.website || "",
        contactPerson: contact.contactPerson || "",
      });
    }
  }, [contact]);

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateContactMutation.mutate({
      id: contactId,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      company: formData.company || null,
      location: formData.location || null,
      category: formData.category || null,
      status: formData.status as any,
      type: formData.type as any,
      notes: formData.notes || null,
      website: formData.website || null,
      contactPerson: formData.contactPerson || null,
    });
  };

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">Loading contact...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contact) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Contact not found</p>
            <Button onClick={() => setLocation("/contacts")} className="mt-4">
              Back to Contacts
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
          onClick={() => setLocation("/contacts")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contacts
        </Button>

        {/* Header Card */}
        <Card className="shadow-md bg-card border-none">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-display font-bold text-foreground mb-3">
                  {contact.name}
                </h1>
                <Badge className={`${getStatusColor(contact.status)}  capitalize border-none shadow-none`}>
                  {contact.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                <Button>Edit Contact</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Contact</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateContact} className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger id="status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prospect">Prospect</SelectItem>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Contact Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                          >
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPerson">Contact Person</Label>
                          <Input
                            id="contactPerson"
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateContactMutation.isPending}>
                          {updateContactMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the contact "{contact.name}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteContactMutation.mutate({ id: contactId })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteContactMutation.isPending ? "Deleting..." : "Delete Contact"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Associated Staff / Parent Company */}
          {contact.type === 'company' ? (
            <Card className="shadow-sm bg-card border-none md:col-span-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-display font-bold text-foreground">Associated Staff Members</h2>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                    {relatedContacts?.length || 0} Contacts
                  </Badge>
                </div>
                
                <div className="grid gap-3 md:grid-cols-3">
                  {relatedContacts && relatedContacts.length > 0 ? (
                    relatedContacts.map((staff: any) => (
                      <div 
                        key={staff.id} 
                        className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/contacts/${staff.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {staff.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{staff.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{staff.contactPerson || "Staff"}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center md:col-span-3">No staff members linked to this company.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : parentContact ? (
            <Card className="shadow-sm bg-primary/5 border border-primary/10 md:col-span-2">
              <CardContent className="pt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Associated Company</p>
                    <h3 className="text-lg font-bold text-foreground">{parentContact.name}</h3>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setLocation(`/contacts/${parentContact.id}`)}
                >
                  View Company Profile
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Basic Information */}
          <Card className="shadow-sm bg-card border-none">
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Contact Information</h2>
              
              {contact.email && contact.email !== "Unknown" && contact.email !== "N/A" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Email</span>
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-primary hover:underline block pl-6"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && contact.phone !== "Unknown" && contact.phone !== "N/A" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-foreground hover:underline block pl-6"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}

              {contact.website && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <span className="font-medium">Website</span>
                  </div>
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline block pl-6"
                  >
                    {contact.website}
                  </a>
                </div>
              )}

              {contact.contactPerson && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Contact Person</span>
                  </div>
                  <p className="text-foreground pl-6">{contact.contactPerson}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company & Location */}
          <Card className="shadow-sm bg-card border-none">
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Company Details</h2>

              {contact.company && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">Company</span>
                  </div>
                  <p className="text-foreground pl-6">{contact.company}</p>
                </div>
              )}

              {contact.location && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">Location</span>
                  </div>
                  <p className="text-foreground pl-6">{contact.location}</p>
                </div>
              )}

              {contact.category && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    <span className="font-medium">Category</span>
                  </div>
                  <p className="text-foreground pl-6">{contact.category}</p>
                </div>
              )}

              {contact.lastContactedAt && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Last Contacted</span>
                  </div>
                  <p className="text-foreground pl-6">
                    {formatDistanceToNow(new Date(contact.lastContactedAt), { addSuffix: true })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {contact.externalId && (
            <Card className="shadow-sm bg-primary/5 border border-primary/10 md:col-span-2">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-display font-bold text-foreground">KwickFlow Business Info</h2>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-none shadow-none">
                    Synced Account
                  </Badge>
                </div>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Subscription</Label>
                    <p className="text-lg font-bold text-primary">
                      {(bizData?.subscription as any)?.planName || (contact.externalData as any)?.subscription?.planName || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(bizData?.subscription as any)?.monthlyPrice || (contact.externalData as any)?.subscription?.monthlyPrice} {(bizData?.subscription as any)?.currency || (contact.externalData as any)?.subscription?.currency} / mo
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${(bizData?.status || (contact.externalData as any)?.status) === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className="font-bold capitalize">{bizData?.status || (contact.externalData as any)?.status || "Unknown"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {((bizData?.subscription as any)?.isActive || (contact.externalData as any)?.subscription?.isActive) ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Owner</Label>
                    {(() => {
                      const ownerName = (bizData?.ownerInfo as any)?.name || (contact.externalData as any)?.owner?.name;
                      const ownerEmail = (bizData?.ownerInfo as any)?.email || (contact.externalData as any)?.owner?.email;
                      const normalizedName = (!ownerName || ownerName === "Unknown" || ownerName === "N/A") ? "N/A" : ownerName;
                      const normalizedEmail = (!ownerEmail || ownerEmail === "Unknown" || ownerEmail === "N/A") ? "" : ownerEmail;
                      
                      return (
                        <>
                          <p className="font-bold">{normalizedName}</p>
                          {normalizedEmail && <p className="text-xs text-muted-foreground truncate">{normalizedEmail}</p>}
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">External IDs</Label>
                    <p className="text-[10px] font-mono truncate text-muted-foreground">Biz: {contact.externalId}</p>
                    <p className="text-[10px] font-mono truncate text-muted-foreground">Owner: {bizData?.ownerUserId || (contact.externalData as any)?.owner?.id}</p>
                  </div>
                </div>

                {!!bizData?.users && (bizData.users as any).length > 0 && (
                  <div className="pt-4 border-t border-primary/10">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 block">Staff Members ({(bizData.users as any).length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {(bizData.users as any).map((user: any) => (
                        <Badge key={user.id} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-none px-3 py-1">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-bold text-xs">{String(user.name || "")}</span>
                            <span className="text-[10px] opacity-70">{String(user.role || "")}</span>
                          </div>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-primary/10 flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">
                    Last sync: {bizData?.updatedAt ? formatDistanceToNow(new Date(bizData.updatedAt as any), { addSuffix: true }) : (contact.externalData as any)?.modifiedDate ? formatDistanceToNow(new Date((contact.externalData as any).modifiedDate), { addSuffix: true }) : "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History and Messages */}
        <div className="grid gap-6">
          <Tabs defaultValue="activities" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activities" className="mt-4">
              <Card className="shadow-sm bg-card border-none">
                <CardContent className="pt-6">
                  {activities && activities.length > 0 ? (
                    <div className="space-y-6">
                      {activities.map((activity: any) => (
                        <div key={activity.id} className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                            {activity.type === 'call' && <Phone className="w-4 h-4 text-accent" />}
                            {activity.type === 'email' && <Mail className="w-4 h-4 text-primary" />}
                            {activity.type === 'meeting' && <Calendar className="w-4 h-4 text-orange-500" />}
                            {activity.type === 'note' && <FileText className="w-4 h-4 text-gray-500" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{activity.title}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          </div>
                        </div>
                      ))}
              </div>
                  ) : (
                    <p className="text-center py-12 text-muted-foreground">No activities recorded yet.</p>
                  )}
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <Card className="shadow-sm bg-card border-none">
                <CardContent className="pt-6 space-y-6">
                  {/* Quick Reply / New Email Form */}
                  {contact.email && (
                    <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        <Mail className="w-3 h-3" />
                        Quick Email to {contact.email}
                      </div>
                      <Textarea 
                        placeholder="Type your message here..." 
                        className="min-h-[100px] bg-background"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          className="gap-2"
                          disabled={!messageText.trim() || sendEmailMutation.isPending}
                          onClick={() => {
                            sendEmailMutation.mutate({
                              to: contact.email!,
                              subject: `Follow up: ${contact.company || contact.name}`,
                              content: messageText,
                              contactId,
                            });
                            setMessageText("");
                          }}
                        >
                          {sendEmailMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Send Email
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Combined Message History */}
                  <div className="space-y-6">
                    {/* Combine database messages and live IMAP emails */}
                    {(() => {
                      const allMsgs = [
                        ...(messages || []).map((m: any) => ({ ...m, source: 'db', date: new Date(m.createdAt) })),
                        ...(liveEmails || []).map(e => ({ 
                          id: `live-${e.uid}`, 
                          type: 'email', 
                          subject: e.subject, 
                          content: e.text, 
                          createdAt: e.date, 
                          date: new Date(e.date as any),
                          source: 'live',
                          from: e.from
                        }))
                      ].sort((a, b) => b.date.getTime() - a.date.getTime());

                      if (allMsgs.length === 0) {
                        return <p className="text-center py-12 text-muted-foreground">No messages found.</p>;
                      }

                      return allMsgs.map((msg: any) => (
                        <div key={msg.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`capitalize border-none shadow-none ${msg.source === 'live' ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                                {msg.type.replace('_', ' ')} {msg.source === 'live' && '(Inbox)'}
                              </Badge>
                              <span className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{msg.subject || "(No Subject)"}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(msg.date, { addSuffix: true })}
                            </span>
                          </div>
                          <div className={`p-4 rounded-lg text-sm whitespace-pre-wrap ${msg.source === 'live' ? 'bg-blue-50/50 border border-blue-100/50' : 'bg-muted/30'}`}>
                            {msg.source === 'live' && <p className="text-[10px] text-blue-500 font-bold uppercase mb-2">From: {msg.from}</p>}
                            {msg.content}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card className="shadow-sm bg-card border-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground italic mb-4">Notes from {contact.name}:</p>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-xl border-none min-h-[150px]">
                    <p className="text-sm leading-relaxed">{contact.notes || "No notes added for this contact."}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <Card className="shadow-sm bg-card border-none">
          <CardContent className="pt-6">
            <div className="flex gap-3 flex-wrap">
              <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                <DialogTrigger asChild>
              <Button className="gap-2">
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Email to {contact.name}</DialogTitle>
                    <DialogDescription>
                      The email will be sent from your configured business email.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-to">To</Label>
                      <Input id="email-to" value={contact.email || ""} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-subject">Subject</Label>
                      <Input 
                        id="email-subject" 
                        placeholder="Project Update" 
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-content">Message</Label>
                      <Textarea 
                        id="email-content" 
                        placeholder="Write your message here..." 
                        className="min-h-[200px]"
                        value={emailForm.content}
                        onChange={(e) => setEmailForm({ ...emailForm, content: e.target.value })}
                      />
                    </div>
                    <Button 
                      className="w-full gap-2" 
                      disabled={sendEmailMutation.isPending || !contact.email}
                      onClick={() => {
                        if (!emailForm.subject || !emailForm.content) {
                          toast.error("Please fill in all fields");
                          return;
                        }
                        sendEmailMutation.mutate({
                          to: contact.email!,
                          subject: emailForm.subject,
                          content: emailForm.content,
                          contactId,
                        });
                      }}
                    >
                      {sendEmailMutation.isPending ? "Sending..." : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                    {!contact.email && (
                      <p className="text-xs text-destructive text-center">
                        This contact does not have an email address.
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2">
                <Phone className="w-4 h-4" />
                    Call with AI Agent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Initiate AI Call</DialogTitle>
                    <DialogDescription>
                      Choose an AI agent to call {contact.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {agents && agents.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          <Label>Select AI Agent</Label>
                          <Select onValueChange={(agentId) => setCallOptions({ ...callOptions, agentId })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent: any) => (
                                <SelectItem key={agent.vapiId} value={agent.vapiId}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {phoneNumbers && phoneNumbers.length > 0 && (
                          <div className="space-y-2">
                            <Label>Outgoing Number (Optional)</Label>
                            <Select onValueChange={(phoneNumberId) => setCallOptions({ ...callOptions, phoneNumberId })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a number" />
                              </SelectTrigger>
                              <SelectContent>
                                {phoneNumbers.map((phone: any) => (
                                  <SelectItem key={phone.vapiId} value={phone.vapiId}>
                                    {phone.number}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            if (!callOptions.agentId) {
                              toast.error("Please select an agent");
                              return;
                            }
                            callMutation.mutate({
                              contactId,
                              agentId: callOptions.agentId,
                              phoneNumberId: callOptions.phoneNumberId || undefined,
                            });
                          }}
                          disabled={callMutation.isPending}
                        >
                          {callMutation.isPending ? "Connecting..." : "Start Call"}
              </Button>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-4">No AI agents found. Create one first in the AI Agents page.</p>
                        <Button onClick={() => setLocation("/agents")}>Go to AI Agents</Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isDealDialogOpen} onOpenChange={setIsDealDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Create Deal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Deal</DialogTitle>
                    <DialogDescription>
                      Start a new sales opportunity with {contact.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="deal-title">Deal Title</Label>
                      <Input 
                        id="deal-title" 
                        placeholder="e.g. Enterprise License" 
                        value={dealForm.title}
                        onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="deal-value">Value</Label>
                        <Input 
                          id="deal-value" 
                          type="number" 
                          value={dealForm.value}
                          onChange={(e) => setDealForm({ ...dealForm, value: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deal-stage">Stage</Label>
                        <Select 
                          value={dealForm.stage}
                          onValueChange={(v: any) => setDealForm({ ...dealForm, stage: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prospecting">Prospecting</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deal-desc">Description</Label>
                      <Textarea 
                        id="deal-desc" 
                        placeholder="Brief summary of the deal..." 
                        value={dealForm.description}
                        onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (!dealForm.title) {
                          toast.error("Deal title is required");
                          return;
                        }
                        createDealMutation.mutate({
                          ...dealForm,
                          contactId,
                        });
                      }}
                      disabled={createDealMutation.isPending}
                    >
                      {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Add Activity</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Activity</DialogTitle>
                    <DialogDescription>
                      Record a past interaction with {contact.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="act-type">Activity Type</Label>
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
                          <SelectItem value="email">Email Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="act-title">Title</Label>
                      <Input 
                        id="act-title" 
                        placeholder="e.g. Discussed pricing" 
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="act-desc">Details</Label>
                      <Textarea 
                        id="act-desc" 
                        placeholder="Notes about the interaction..." 
                        value={activityForm.description}
                        onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (!activityForm.title) {
                          toast.error("Title is required");
                          return;
                        }
                        createActivityMutation.mutate({
                          ...activityForm,
                          contactId,
                        });
                      }}
                      disabled={createActivityMutation.isPending}
                    >
                      {createActivityMutation.isPending ? "Saving..." : "Save Activity"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Schedule Meeting</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Meeting</DialogTitle>
                    <DialogDescription>
                      Plan a future meeting with {contact.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="mtg-title">Meeting Title</Label>
                      <Input 
                        id="mtg-title" 
                        placeholder="e.g. Discovery Call" 
                        value={meetingForm.title}
                        onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mtg-date">Date & Time</Label>
                      <Input 
                        id="mtg-date" 
                        type="datetime-local" 
                        value={meetingForm.scheduledFor}
                        onChange={(e) => setMeetingForm({ ...meetingForm, scheduledFor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mtg-desc">Agenda</Label>
                      <Textarea 
                        id="mtg-desc" 
                        placeholder="What will be discussed?" 
                        value={meetingForm.description}
                        onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (!meetingForm.title || !meetingForm.scheduledFor) {
                          toast.error("Title and Date are required");
                          return;
                        }
                        createActivityMutation.mutate({
                          type: "meeting",
                          title: meetingForm.title,
                          description: meetingForm.description,
                          scheduledFor: new Date(meetingForm.scheduledFor).toISOString(),
                          contactId,
                        });
                      }}
                      disabled={createActivityMutation.isPending}
                    >
                      {createActivityMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

