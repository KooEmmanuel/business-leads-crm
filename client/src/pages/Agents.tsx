import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Plus, Phone, Settings, Play, RefreshCw, Smartphone, History, ExternalLink, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Agents() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportPhoneOpen, setIsImportPhoneOpen] = useState(false);
  const [isProvisionPhoneOpen, setIsProvisionPhoneOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  
  const utils = trpc.useUtils();
  const { data: agents, isLoading: agentsLoading } = trpc.vapi.listAgents.useQuery(undefined, {
    refetchInterval: 60000, // Auto-sync agents every 60 seconds
  });
  const { data: phoneNumbers, isLoading: phonesLoading } = trpc.vapi.listPhoneNumbers.useQuery(undefined, {
    refetchInterval: 60000, // Auto-sync phone numbers every 60 seconds
  });
  const { data: calls, isLoading: callsLoading } = trpc.vapi.listCalls.useQuery(undefined, {
    refetchInterval: 30000, // Auto-sync calls every 30 seconds
  });
  
  const createAgentMutation = trpc.vapi.createAgent.useMutation({
    onSuccess: () => {
      toast.success("AI Agent created successfully");
      utils.vapi.listAgents.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });

  const updateAgentMutation = trpc.vapi.updateAgent.useMutation({
    onSuccess: () => {
      toast.success("AI Agent updated successfully");
      utils.vapi.listAgents.invalidate();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update agent: ${error.message}`);
    },
  });

  const deleteAgentMutation = trpc.vapi.deleteAgent.useMutation({
    onSuccess: () => {
      toast.success("AI Agent deleted successfully");
      utils.vapi.listAgents.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete agent: ${error.message}`);
    },
  });

  const initiateAdhocCallMutation = trpc.vapi.initiateAdhocCall.useMutation({
    onSuccess: () => {
      toast.success("Test call initiated! Check your phone.");
      setIsTestDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to initiate test call: ${error.message}`);
    },
  });

  const provisionPhoneMutation = trpc.vapi.provisionPhoneNumber.useMutation({
    onSuccess: () => {
      toast.success("Vapi phone number created successfully");
      utils.vapi.listPhoneNumbers.invalidate();
      setIsProvisionPhoneOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create phone number: ${error.message}`);
    },
  });

  const importPhoneMutation = trpc.vapi.importPhoneNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number imported successfully");
      utils.vapi.listPhoneNumbers.invalidate();
      setIsImportPhoneOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to import phone: ${error.message}`);
    },
  });

  const [agentForm, setAgentForm] = useState({
    vapiId: "",
    name: "",
    model: "gpt-4o",
    voice: "Elliot",
    voiceProvider: "vapi",
    firstMessage: "",
    systemPrompt: "",
    voicemailMessage: "",
    endCallMessage: "",
  });

  const [testForm, setTestForm] = useState({
    phoneNumber: "",
    agentId: "",
  });

  const [phoneForm, setPhoneForm] = useState({
    number: "",
    provider: "twilio",
    twilioAccountSid: "",
    twilioAuthToken: "",
  });

  const [provisionForm, setProvisionForm] = useState({
    areaCode: "",
    name: "",
  });

  const syncPhonesMutation = trpc.vapi.syncPhoneNumbers.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} phone numbers from Vapi`);
      utils.vapi.listPhoneNumbers.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to sync: ${error.message}`);
    },
  });

  const syncAgentsMutation = trpc.vapi.syncAgents.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} AI agents from Vapi`);
      utils.vapi.listAgents.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to sync: ${error.message}`);
    },
  });

  const syncCallsMutation = trpc.vapi.syncCalls.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} calls from Vapi`);
      utils.vapi.listCalls.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to sync calls: ${error.message}`);
    },
  });

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [linkAssistantId, setLinkAssistantId] = useState<string>("");

  const updatePhoneMutation = trpc.vapi.updatePhoneNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number updated successfully");
      utils.vapi.listPhoneNumbers.invalidate();
      setSelectedPhone(null);
    },
    onError: (error) => {
      toast.error(`Failed to update phone: ${error.message}`);
    },
  });

  const handleLinkAssistant = (phoneId: string) => {
    updatePhoneMutation.mutate({
      id: phoneId,
      assistantId: linkAssistantId || undefined,
    });
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    createAgentMutation.mutate(agentForm);
  };

  const handleUpdateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    updateAgentMutation.mutate(agentForm);
  };

  const handleTestAgent = (e: React.FormEvent) => {
    e.preventDefault();
    initiateAdhocCallMutation.mutate({
      agentId: testForm.agentId,
      phoneNumber: testForm.phoneNumber,
    });
  };

  const handleImportPhone = (e: React.FormEvent) => {
    e.preventDefault();
    importPhoneMutation.mutate(phoneForm);
  };

  const handleProvisionPhone = (e: React.FormEvent) => {
    e.preventDefault();
    provisionPhoneMutation.mutate(provisionForm);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">AI Agents</h1>
            <p className="text-muted-foreground mt-2">Manage your Vapi voice assistants, phone numbers, and call logs</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                syncAgentsMutation.mutate();
                syncPhonesMutation.mutate();
                syncCallsMutation.mutate();
              }}
              disabled={syncAgentsMutation.isPending || syncPhonesMutation.isPending || syncCallsMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 ${(syncAgentsMutation.isPending || syncPhonesMutation.isPending || syncCallsMutation.isPending) ? "animate-spin" : ""}`} />
              Sync All
            </Button>
            <Dialog open={isProvisionPhoneOpen} onOpenChange={setIsProvisionPhoneOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Get Vapi Number
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Get New Vapi Number</DialogTitle>
                  <DialogDescription>
                    Vapi provides up to 10 free U.S. numbers.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProvisionPhone} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="areaCode">Area Code (3 digits, optional)</Label>
                    <Input
                      id="areaCode"
                      placeholder="762"
                      maxLength={3}
                      value={provisionForm.areaCode}
                      onChange={(e) => setProvisionForm({ ...provisionForm, areaCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      placeholder="My Sales Line"
                      value={provisionForm.name}
                      onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={provisionPhoneMutation.isPending}>
                    {provisionPhoneMutation.isPending ? "Requesting..." : "Provision Number"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isImportPhoneOpen} onOpenChange={setIsImportPhoneOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Smartphone className="w-4 h-4" />
                  Import Phone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Phone Number</DialogTitle>
                  <DialogDescription>
                    Connect an existing phone number from Twilio or other providers to Vapi.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleImportPhone} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (E.164 format)</Label>
                    <Input
                      id="phone"
                      placeholder="+1234567890"
                      value={phoneForm.number}
                      onChange={(e) => setPhoneForm({ ...phoneForm, number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select
                      value={phoneForm.provider}
                      onValueChange={(v) => setPhoneForm({ ...phoneForm, provider: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="vonage">Vonage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {phoneForm.provider === "twilio" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="sid">Twilio Account SID</Label>
                        <Input
                          id="sid"
                          value={phoneForm.twilioAccountSid}
                          onChange={(e) => setPhoneForm({ ...phoneForm, twilioAccountSid: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="token">Twilio Auth Token</Label>
                        <Input
                          id="token"
                          type="password"
                          value={phoneForm.twilioAuthToken}
                          onChange={(e) => setPhoneForm({ ...phoneForm, twilioAuthToken: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}
                  <Button type="submit" className="w-full" disabled={importPhoneMutation.isPending}>
                    {importPhoneMutation.isPending ? "Importing..." : "Import Number"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create AI Agent</DialogTitle>
                  <DialogDescription>
                    Configure a new Vapi voice assistant for your business.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAgent} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agentName">Agent Name</Label>
                      <Input
                        id="agentName"
                        placeholder="Sales Assistant"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Select
                        value={agentForm.model}
                        onValueChange={(v) => setAgentForm({ ...agentForm, model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o (Newest)</SelectItem>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voice">Voice</Label>
                      <Select
                        value={agentForm.voice}
                        onValueChange={(v) => {
                          let provider = "vapi";
                          if (v === "josh" || v === "rachel") provider = "11labs";
                          if (v === "will") provider = "playht";
                          setAgentForm({ ...agentForm, voice: v, voiceProvider: provider });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Elliot">Elliot (Vapi, Male)</SelectItem>
                          <SelectItem value="Emily">Emily (Vapi, Female)</SelectItem>
                          <SelectItem value="josh">Josh (11Labs, Male)</SelectItem>
                          <SelectItem value="rachel">Rachel (11Labs, Female)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstMessage">First Message</Label>
                    <Input
                      id="firstMessage"
                      placeholder="Hello, I'm calling from Wellness Partners..."
                      value={agentForm.firstMessage}
                      onChange={(e) => setAgentForm({ ...agentForm, firstMessage: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voicemailMessage">Voicemail Message</Label>
                      <Input
                        id="voicemailMessage"
                        placeholder="Please call us back..."
                        value={agentForm.voicemailMessage}
                        onChange={(e) => setAgentForm({ ...agentForm, voicemailMessage: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endCallMessage">End Call Message</Label>
                      <Input
                        id="endCallMessage"
                        placeholder="Have a wonderful day!"
                        value={agentForm.endCallMessage}
                        onChange={(e) => setAgentForm({ ...agentForm, endCallMessage: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt">System Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="You are Riley, an appointment scheduling voice assistant..."
                      className="min-h-[150px]"
                      value={agentForm.systemPrompt}
                      onChange={(e) => setAgentForm({ ...agentForm, systemPrompt: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createAgentMutation.isPending}>
                    {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit AI Agent</DialogTitle>
                  <DialogDescription>
                    Update your agent configuration.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateAgent} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editAgentName">Agent Name</Label>
                      <Input
                        id="editAgentName"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editModel">Model</Label>
                      <Select
                        value={agentForm.model}
                        onValueChange={(v) => setAgentForm({ ...agentForm, model: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o (Newest)</SelectItem>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editVoice">Voice</Label>
                      <Select
                        value={agentForm.voice}
                        onValueChange={(v) => {
                          let provider = "vapi";
                          if (v === "josh" || v === "rachel") provider = "11labs";
                          if (v === "will") provider = "playht";
                          setAgentForm({ ...agentForm, voice: v, voiceProvider: provider });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Elliot">Elliot (Vapi, Male)</SelectItem>
                          <SelectItem value="Emily">Emily (Vapi, Female)</SelectItem>
                          <SelectItem value="josh">Josh (11Labs, Male)</SelectItem>
                          <SelectItem value="rachel">Rachel (11Labs, Female)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editFirstMessage">First Message</Label>
                    <Input
                      id="editFirstMessage"
                      value={agentForm.firstMessage}
                      onChange={(e) => setAgentForm({ ...agentForm, firstMessage: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editVoicemailMessage">Voicemail Message</Label>
                      <Input
                        id="editVoicemailMessage"
                        value={agentForm.voicemailMessage}
                        onChange={(e) => setAgentForm({ ...agentForm, voicemailMessage: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editEndCallMessage">End Call Message</Label>
                      <Input
                        id="editEndCallMessage"
                        value={agentForm.endCallMessage}
                        onChange={(e) => setAgentForm({ ...agentForm, endCallMessage: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPrompt">System Prompt</Label>
                    <Textarea
                      id="editPrompt"
                      className="min-h-[150px]"
                      value={agentForm.systemPrompt}
                      onChange={(e) => setAgentForm({ ...agentForm, systemPrompt: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="flex-1 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this agent?")) {
                          deleteAgentMutation.mutate({ vapiId: agentForm.vapiId });
                        }
                      }}
                      disabled={deleteAgentMutation.isPending}
                    >
                      Delete Agent
                    </Button>
                    <Button type="submit" className="flex-2" disabled={updateAgentMutation.isPending}>
                      {updateAgentMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Test AI Agent</DialogTitle>
                  <DialogDescription>
                    Enter your phone number to receive a test call from this agent.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTestAgent} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="testPhone">Your Phone Number (E.164)</Label>
                    <Input
                      id="testPhone"
                      placeholder="+1234567890"
                      value={testForm.phoneNumber}
                      onChange={(e) => setTestForm({ ...testForm, phoneNumber: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={initiateAdhocCallMutation.isPending}>
                    {initiateAdhocCallMutation.isPending ? "Connecting..." : "Call Me Now"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
            <TabsTrigger value="agents">Assistants</TabsTrigger>
            <TabsTrigger value="phones">Phone Numbers</TabsTrigger>
            <TabsTrigger value="calls">Call History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agents" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {agentsLoading ? (
                <p className="text-muted-foreground">Loading agents...</p>
              ) : agents?.length === 0 ? (
                <Card className="col-span-full border-none shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bot className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground">No AI agents created yet.</p>
                  </CardContent>
                </Card>
              ) : (
                agents?.map((agent: any) => (
                  <Card key={agent.id} className="h-full flex flex-col border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xl font-display font-bold">{agent.name}</CardTitle>
                      <Bot className="w-5 h-5 text-primary" />
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Model: <span className="text-foreground">{agent.model}</span></p>
                        <p className="text-sm text-muted-foreground">Voice: <span className="text-foreground capitalize">{agent.voice}</span></p>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">First Message</p>
                        <p className="text-sm line-clamp-2 italic">"{agent.firstMessage}"</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 pt-0">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => {
                          setAgentForm({
                            vapiId: agent.vapiId,
                            name: agent.name,
                            model: agent.model || "gpt-4o",
                            voice: agent.voice || "Elliot",
                            voiceProvider: "vapi",
                            firstMessage: agent.firstMessage || "",
                            systemPrompt: agent.systemPrompt || "",
                            voicemailMessage: agent.voicemailMessage || "",
                            endCallMessage: agent.endCallMessage || "",
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => {
                          setTestForm({ ...testForm, agentId: agent.vapiId });
                          setIsTestDialogOpen(true);
                        }}
                      >
                        <Play className="w-4 h-4" />
                        Test
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="phones" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {phonesLoading ? (
                <p className="text-muted-foreground">Loading phone numbers...</p>
              ) : phoneNumbers?.length === 0 ? (
                <Card className="col-span-full border-none shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Phone className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground">No phone numbers imported yet.</p>
                  </CardContent>
                </Card>
              ) : (
                phoneNumbers?.map((phone: any) => (
                  <Card key={phone.id} className="h-full flex flex-col border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xl font-display font-bold">{phone.number}</CardTitle>
                      <Smartphone className="w-5 h-5 text-primary" />
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Provider: <span className="text-foreground capitalize">{phone.provider}</span></p>
                        <p className="text-sm text-muted-foreground">Vapi ID: <span className="text-foreground truncate block">{phone.vapiId}</span></p>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Linked Assistant</Label>
                        <div className="flex gap-2">
                          <Select 
                            defaultValue={phone.assistantId?.toString()} 
                            onValueChange={(v) => setLinkAssistantId(v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="No assistant linked" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents?.map((a: any) => (
                                <SelectItem key={a.vapiId} value={a.vapiId}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="secondary" 
                            size="icon-sm" 
                            onClick={() => handleLinkAssistant(phone.vapiId)}
                            disabled={updatePhoneMutation.isPending}
                          >
                            <RefreshCw className={`h-3 w-3 ${updatePhoneMutation.isPending ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground">
                        <Settings className="w-4 h-4" />
                        Advanced Settings
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="calls" className="mt-6">
            <div className="space-y-4">
              {callsLoading ? (
                <p className="text-muted-foreground">Loading calls...</p>
              ) : !calls || calls.length === 0 ? (
                <Card className="border-none shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <History className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground">No call history found. Click "Sync All" to fetch calls.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {calls.map((call: any) => (
                    <Card key={call.id} className="border-none shadow-sm hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedCall(call)}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${call.type === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {call.type === 'inbound' ? <Smartphone className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{call.customerNumber || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">
                              {call.startedAt ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true }) : "Unknown time"} • {call.duration ? `${call.duration}s` : 'No duration'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={
                              call.status === 'completed' ? 'default' : 
                              (call.status === 'failed' || call.status === 'no-answer' || call.status === 'busy') ? 'destructive' : 
                              'secondary'
                            } 
                            className="capitalize border-none shadow-none"
                          >
                            {call.status}
                          </Badge>
                          <Button variant="ghost" size="icon-sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Call Details
                    <Badge 
                      variant={
                        selectedCall?.status === 'completed' ? 'default' : 
                        (selectedCall?.status === 'failed' || selectedCall?.status === 'no-answer' || selectedCall?.status === 'busy') ? 'destructive' : 
                        'secondary'
                      }
                      className="capitalize border-none shadow-none"
                    >
                      {selectedCall?.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCall?.startedAt && new Date(selectedCall.startedAt).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Customer</Label>
                      <p className="font-medium">{selectedCall?.customerNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Call ID</Label>
                      <p className="font-mono text-xs truncate">{selectedCall?.vapiCallId}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Duration</Label>
                      <p className="font-medium">{selectedCall?.duration} seconds</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                      <p className="font-medium capitalize">{selectedCall?.type}</p>
                    </div>
                  </div>

                  {(selectedCall?.status === 'failed' || selectedCall?.status === 'no-answer' || selectedCall?.status === 'busy') && (
                    <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        This call could not be completed. Status: <span className="capitalize">{selectedCall.status}</span>.
                      </p>
                      <p className="text-xs text-destructive/80 mt-1">
                        Common reasons: invalid phone number, recipient declined, or network issues.
                      </p>
                    </div>
                  )}

                  {selectedCall?.summary && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">AI Summary</Label>
                      <div className="bg-muted/50 p-4 rounded-lg text-sm italic leading-relaxed">
                        "{selectedCall.summary}"
                      </div>
                    </div>
                  )}

                  {selectedCall?.transcript && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Transcript</Label>
                      <div className="bg-muted/30 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed">
                        {selectedCall.transcript}
                      </div>
                    </div>
                  )}

                  {selectedCall?.recordingUrl && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Recording</Label>
                      <audio controls key={selectedCall.vapiCallId} className="w-full h-10">
                        <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setSelectedCall(null)}>Close</Button>
                  <Button variant="default" className="gap-2" onClick={() => window.open(`https://dashboard.vapi.ai/calls/${selectedCall?.vapiCallId}`, '_blank')}>
                    View in Vapi <ExternalLink className="w-4 h-4" />
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

