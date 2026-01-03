import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Messages() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");

  // Mock data for demonstration
  const conversations = [
    {
      id: 1,
      contactName: "Sarah Johnson",
      company: "Tech Solutions Inc",
      lastMessage: "Thanks for the proposal. We'll review and get back to you.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      unread: 2,
      messages: [
        { id: 1, sender: "You", text: "Hi Sarah, here's the proposal we discussed.", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        { id: 2, sender: "Sarah Johnson", text: "Thanks for the proposal. We'll review and get back to you.", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      ]
    },
    {
      id: 2,
      contactName: "Mike Chen",
      company: "Digital Marketing Pro",
      lastMessage: "When can we schedule a call?",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      unread: 1,
      messages: [
        { id: 1, sender: "Mike Chen", text: "When can we schedule a call?", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
      ]
    },
    {
      id: 3,
      contactName: "Emma Davis",
      company: "Creative Agency",
      lastMessage: "Looking forward to working with you!",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      unread: 0,
      messages: [
        { id: 1, sender: "You", text: "Welcome aboard! Let's schedule our first meeting.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { id: 2, sender: "Emma Davis", text: "Looking forward to working with you!", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ]
    },
  ];

  const filteredConversations = conversations.filter(conv =>
    conv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversation = selectedThread ? conversations.find(c => c.id === selectedThread) : null;

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessageText("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-2">Manage your conversations</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Select contact" />
              <Input placeholder="Subject" />
              <textarea placeholder="Message" className="w-full px-3 py-2 border border-border rounded min-h-[120px]" />
              <Button className="w-full">Send Message</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="border-4 border-border bg-card h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filteredConversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedThread(conversation.id)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedThread === conversation.id
                      ? "bg-primary/20 border-2 border-primary"
                      : "hover:bg-secondary/50 border-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-foreground truncate">{conversation.contactName}</h4>
                      <p className="text-xs text-muted-foreground truncate">{conversation.company}</p>
                      <p className="text-sm text-muted-foreground truncate mt-1">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground shrink-0">{conversation.unread}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Chat View */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="border-4 border-border bg-card h-[600px] flex flex-col">
              <CardHeader className="border-b-2 border-border">
                <CardTitle>{selectedConversation.contactName}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedConversation.company}</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4 py-4">
                {selectedConversation.messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "You" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.sender === "You"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t-2 border-border p-4 space-y-2">
                <textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-border rounded bg-input text-foreground min-h-[80px]"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="w-full gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-4 border-border bg-card h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Select a conversation to view messages</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
