import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Search, Plus, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Contact } from "../../../drizzle/schema";

export default function Contacts() {
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filteredContacts = (contacts || []).filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "customer":
        return "bg-green-500/20 text-green-700 border-green-300";
      case "lead":
        return "bg-blue-500/20 text-blue-700 border-blue-300";
      case "prospect":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-2">Manage your business leads and customers</p>
        </div>
        <Dialog>
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
            <div className="space-y-4">
              <Input placeholder="Contact name" />
              <Input placeholder="Email" type="email" />
              <Input placeholder="Phone" />
              <Input placeholder="Company" />
              <Button className="w-full">Create Contact</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts by name, email, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">{(contacts || []).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Contacts</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">
              {(contacts || []).filter(c => c.status === "customer").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Customers</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-primary">
              {(contacts || []).filter(c => c.status === "lead").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Leads</p>
          </CardContent>
        </Card>
        <Card className="brutalist-card bg-card">
          <CardContent className="pt-6">
            <div className="text-3xl font-display font-bold text-accent">
              {(contacts || []).filter(c => c.status === "prospect").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Prospects</p>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card
              key={contact.id}
              className="brutalist-card bg-card hover:bg-card/80 cursor-pointer transition-colors"
              onClick={() => setSelectedContact(contact)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-display font-bold">{contact.name}</h3>
                      <Badge className={`${getStatusColor(contact.status)} border-2`}>
                        {contact.status}
                      </Badge>
                    </div>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground mb-3">{contact.company}</p>
                    )}
                    <div className="space-y-2">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-primary" />
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-accent" />
                          <a href={`tel:${contact.phone}`} className="text-foreground">
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
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedContact.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground">{selectedContact.email || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-foreground">{selectedContact.phone || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-foreground">{selectedContact.company || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={`${getStatusColor(selectedContact.status)} border-2 w-fit mt-1`}>
                    {selectedContact.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-foreground whitespace-pre-wrap">{selectedContact.notes || "No notes"}</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Create Deal</Button>
                <Button variant="outline" className="flex-1">Add Activity</Button>
                <Button variant="outline" className="flex-1">Send Message</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
