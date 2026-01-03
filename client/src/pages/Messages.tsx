import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Search, Plus, Mail, RefreshCw, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [newEmailForm, setNewEmailForm] = useState({
    to: "",
    subject: "",
    content: "",
    contactId: undefined as number | undefined,
  });
  const [isNewEmailOpen, setIsNewEmailOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const utils = trpc.useUtils();
  const { data: contacts } = trpc.contacts.list.useQuery();
  const { data: emails, isLoading: emailsLoading } = trpc.email.list.useQuery(undefined, {
    refetchInterval: 30000, // Poll for new emails every 30 seconds
    refetchOnWindowFocus: true,
  });

  const sendEmailMutation = trpc.email.send.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully");
      utils.email.list.invalidate();
      setMessageText("");
      setIsNewEmailOpen(false);
      setNewEmailForm({ to: "", subject: "", content: "", contactId: undefined });
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const handleSendMessage = () => {
    if (messageText.trim() && selectedThread) {
      sendEmailMutation.mutate({
        to: selectedThread.fromEmail || selectedThread.from || "",
        subject: `Re: ${selectedThread.subject}`,
        content: messageText,
      });
    }
  };

  const handleSendNewEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailForm.to || !newEmailForm.subject || !newEmailForm.content) {
      toast.error("Please fill in all fields");
      return;
    }
    sendEmailMutation.mutate({
      to: newEmailForm.to,
      subject: newEmailForm.subject,
      content: newEmailForm.content,
      contactId: newEmailForm.contactId,
    });
  };

  const filteredEmails = (emails || []).filter(email =>
    email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group emails into threads by threadId
  const threads = filteredEmails.reduce((acc: any[], email: any) => {
    const threadKey = email.threadId || email.subject?.replace(/^(Re|Fwd|Aw|Rif):\s*/i, "").trim().toLowerCase() || "no-subject";
    let thread = acc.find(t => t.id === threadKey);
    
    if (thread) {
      thread.messages.push(email);
      // Update thread timestamp to most recent message
      if (new Date(email.date) > new Date(thread.lastDate)) {
        thread.lastDate = email.date;
        thread.lastMessage = email.text;
      }
    } else {
      acc.push({
        id: threadKey,
        subject: email.subject?.replace(/^(Re|Fwd|Aw|Rif):\s*/i, "").trim() || "No Subject",
        from: email.from,
        fromEmail: email.fromEmail,
        lastDate: email.date,
        lastMessage: email.text,
        messages: [email]
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-2">Manage your email conversations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => utils.email.list.invalidate()} disabled={emailsLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${emailsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isNewEmailOpen} onOpenChange={setIsNewEmailOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
                New Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Send New Email</DialogTitle>
            </DialogHeader>
              <form onSubmit={handleSendNewEmail} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Contact</Label>
                  <Select 
                    onValueChange={(val) => {
                      const contact = contacts?.find((c: any) => c.id.toString() === val);
                      if (contact) {
                        setNewEmailForm({ 
                          ...newEmailForm, 
                          to: contact.email || "", 
                          contactId: contact.id 
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a contact..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts?.filter((c: any) => c.email).map((contact: any) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} ({contact.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-to">Recipient Email</Label>
                  <Input 
                    id="new-to"
                    placeholder="or type email manually..." 
                    value={newEmailForm.to}
                    onChange={(e) => setNewEmailForm({ ...newEmailForm, to: e.target.value, contactId: undefined })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-subject">Subject</Label>
                  <Input 
                    id="new-subject"
                    placeholder="Subject" 
                    value={newEmailForm.subject}
                    onChange={(e) => setNewEmailForm({ ...newEmailForm, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-content">Message</Label>
                  <textarea 
                    id="new-content"
                    placeholder="Message" 
                    className="w-full px-3 py-2 border-none rounded bg-muted/50 focus:bg-muted/80 transition-colors min-h-[120px] outline-none"
                    value={newEmailForm.content}
                    onChange={(e) => setNewEmailForm({ ...newEmailForm, content: e.target.value })}
                    required
                  />
            </div>
                <Button type="submit" className="w-full" disabled={sendEmailMutation.isPending}>
                  {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                </Button>
              </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm bg-card h-[700px] flex flex-col border-none">
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inbox..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {emailsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading inbox...</p>
              ) : threads.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No emails found</p>
              ) : (
                threads.map((thread: any) => (
                <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedThread?.id === thread.id
                        ? "bg-primary/10"
                        : "hover:bg-secondary/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-foreground truncate">{thread.from}</h4>
                        <p className="text-xs font-medium text-primary truncate">{thread.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground truncate flex-1">{thread.lastMessage}</p>
                          {thread.messages.length > 1 && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">{thread.messages.length}</Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {thread.lastDate ? formatDistanceToNow(new Date(thread.lastDate), { addSuffix: true }) : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat View */}
        <div className="lg:col-span-2">
          {selectedThread ? (
            <Card className="shadow-sm bg-card h-[700px] flex flex-col border-none">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedThread.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground">With: {selectedThread.from}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{selectedThread.messages.length} Messages</Badge>
                    <Mail className="w-5 h-5 text-primary opacity-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-6 py-6 px-6">
                {selectedThread.messages.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((msg: any, idx: number) => (
                  <div key={msg.uid} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {msg.from.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{msg.from}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(msg.date).toLocaleString()}</span>
                    </div>
                    <div className="bg-muted/30 p-6 rounded-2xl rounded-tl-none border-none">
                      {msg.html ? (
                        <div 
                          className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: msg.html }}
                        />
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t border-border/50 p-4 space-y-2">
                <textarea
                  placeholder="Type your reply..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-3 py-2 border-none rounded bg-muted/50 focus:bg-muted/80 transition-colors min-h-[80px] outline-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground">Reply will be sent to {selectedThread.fromEmail}</p>
                <Button
                  onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendEmailMutation.isPending}
                    className="gap-2 px-8"
                >
                    {sendEmailMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                  <Send className="w-4 h-4" />
                    )}
                    Send Reply
                </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="shadow-sm bg-card h-[700px] flex items-center justify-center border-none">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-muted-foreground opacity-30" />
                </div>
                <p className="text-muted-foreground font-medium">Select a conversation</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Choose an email thread to view the full history</p>
              </div>
            </Card>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
