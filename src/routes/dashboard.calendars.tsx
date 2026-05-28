import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Video, Monitor, Mail, Smartphone, RefreshCw, Edit2, Trash2, Cloud, Link2, MessageSquare, FileText, Cpu, ListFilter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/calendars")({
  component: CalendarsPage,
});

const providers = [
  // Calendars
  { id: "google_calendar", name: "Google Calendar", category: "calendar", icon: Calendar, desc: "Sync events and prevent double bookings", color: "text-blue-400" },
  { id: "outlook", name: "Outlook Calendar", category: "calendar", icon: Mail, desc: "Sync with Microsoft Outlook calendar", color: "text-violet-400" },
  { id: "apple", name: "Apple Calendar", category: "calendar", icon: Smartphone, desc: "Sync with Apple Calendar feed", color: "text-pink-400" },
  { id: "icloud", name: "iCloud Calendar", category: "calendar", icon: Cloud, desc: "Connect directly to iCloud calendars", color: "text-sky-400" },
  
  // Meetings
  { id: "zoom", name: "Zoom", category: "meeting", icon: Monitor, desc: "Create Zoom meetings automatically", color: "text-sky-400" },
  { id: "google_meet", name: "Google Meet", category: "meeting", icon: Video, desc: "Auto-generate Google Meet links", color: "text-emerald-400" },
  { id: "teams", name: "Microsoft Teams", category: "meeting", icon: Video, desc: "Create Microsoft Teams meetings", color: "text-indigo-400" },
  { id: "webex", name: "Cisco Webex", category: "meeting", icon: Monitor, desc: "Integrate with Cisco Webex schedules", color: "text-teal-400" },
  { id: "custom_link", name: "Custom Link", category: "meeting", icon: Link2, desc: "Use static custom meeting link", color: "text-muted-foreground" },

  // Productivity
  { id: "slack", name: "Slack", category: "productivity", icon: MessageSquare, desc: "Send booking alerts to Slack", color: "text-orange-400" },
  { id: "notion", name: "Notion", category: "productivity", icon: FileText, desc: "Log meetings directly into Notion", color: "text-slate-300" },
  { id: "calendly_import", name: "Calendly Import", category: "productivity", icon: RefreshCw, desc: "Import scheduling parameters", color: "text-blue-500" },
  { id: "webhook", name: "CRM / Webhooks", category: "productivity", icon: Cpu, desc: "Trigger external workflows or custom CRMs", color: "text-amber-500" },
];

function CalendarsPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Tables<"integrations">[]>([]);
  const [activeProvider, setActiveProvider] = useState<typeof providers[0] | null>(null);
  const [editingConn, setEditingConn] = useState<Tables<"integrations"> | null>(null);
  
  // Form fields for connection
  const [email, setEmail] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [oauthToken, setOauthToken] = useState("");
  const [customLink, setCustomLink] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  async function loadConnections() {
    if (!user) return;
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to load integrations: " + error.message);
    } else if (data) {
      setConnections(data);
    }
  }

  function handleConnect(provider: typeof providers[0]) {
    setActiveProvider(provider);
    setEditingConn(null);
    setEmail("");
    setMeetingUrl("");
    setCalendarUrl("");
    setApiKey("");
    setOauthToken("");
    setCustomLink("");
    setWebhookUrl("");
  }

  function handleEdit(conn: Tables<"integrations">) {
    const provider = providers.find((p) => p.id === conn.provider);
    if (!provider) return;
    setActiveProvider(provider);
    setEditingConn(conn);
    
    setEmail(conn.provider_email || "");
    const connData = (conn.connection_data as any) || {};
    setMeetingUrl(connData.meeting_url || "");
    setCalendarUrl(connData.calendar_url || "");
    setApiKey(connData.api_key || "");
    setOauthToken(connData.oauth_token || "");
    setCustomLink(connData.custom_link || "");
    setWebhookUrl(connData.webhook_url || "");
  }

  async function handleSaveConnection() {
    if (!user || !activeProvider) return;
    if (!email) return toast.error("Account Email is required.");

    setLoading(true);

    const connection_data = {
      meeting_url: meetingUrl,
      calendar_url: calendarUrl,
      api_key: apiKey,
      oauth_token: oauthToken,
      custom_link: customLink,
      webhook_url: webhookUrl,
    };

    if (editingConn) {
      // Update
      const { error } = await supabase
        .from("integrations")
        .update({
          provider_email: email,
          connection_data,
          last_synced: new Date().toISOString(),
          sync_status: "synced",
        })
        .eq("id", editingConn.id);

      if (error) {
        toast.error("Failed to update connection: " + error.message);
      } else {
        toast.success(`${activeProvider.name} (${email}) updated successfully!`);
        setActiveProvider(null);
        loadConnections();
      }
    } else {
      // Check if duplicate connection exists (unique user_id, provider, provider_email)
      const isDuplicate = connections.some(
        (c) => c.provider === activeProvider.id && c.provider_email === email
      );
      if (isDuplicate) {
        toast.error(`You have already connected ${activeProvider.name} using the email ${email}.`);
        setLoading(false);
        return;
      }

      // Create new connection
      const { data, error } = await supabase.from("integrations").insert({
        user_id: user.id,
        provider: activeProvider.id,
        provider_email: email,
        connection_data,
        status: "connected",
        sync_status: "synced",
        last_synced: new Date().toISOString(),
      }).select().single();

      if (error) {
        toast.error("Failed to connect: " + error.message);
      } else {
        // Create sync log
        await supabase.from("integration_sync_logs").insert({
          integration_id: data.id,
          sync_status: "success",
          sync_message: "Initial sync succeeded",
        });

        toast.success(`${activeProvider.name} connected successfully!`);
        setActiveProvider(null);
        loadConnections();
      }
    }
    setLoading(false);
  }

  async function handleDisconnect(id: string, label: string) {
    const { error } = await supabase.from("integrations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to disconnect: " + error.message);
    } else {
      toast.success(`${label} disconnected successfully!`);
      loadConnections();
    }
  }

  async function handleReconnect(conn: Tables<"integrations">, label: string) {
    const { error } = await supabase
      .from("integrations")
      .update({
        status: "connected",
        sync_status: "synced",
        last_synced: new Date().toISOString(),
      })
      .eq("id", conn.id);

    if (error) {
      toast.error("Failed to reconnect: " + error.message);
    } else {
      // Add sync log
      await supabase.from("integration_sync_logs").insert({
        integration_id: conn.id,
        sync_status: "success",
        sync_message: "Manual sync triggered and completed",
      });

      toast.success(`Reconnected and synced ${label}!`);
      loadConnections();
    }
  }

  function getConnections(providerId: string) {
    return connections.filter((c) => c.provider === providerId);
  }

  return (
    <div className="space-y-6 animate-fade-in px-4 sm:px-6 max-w-6xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">App Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect calendars, video conferencing tools, and productivity workflows.
          </p>
        </div>
      </div>

      {/* Connected Integrations Card Directory */}
      {connections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ListFilter className="h-3.5 w-3.5" /> Connected Services ({connections.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn) => {
              const p = providers.find((pr) => pr.id === conn.provider) || {
                name: conn.provider,
                icon: Cpu,
                color: "text-muted-foreground",
                desc: "Custom external integration",
              };
              return (
                <Card key={conn.id} className="border border-border/60 hover:shadow-sm transition-all duration-200">
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl bg-primary/5 ${p.color} shrink-0`}>
                          <p.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate text-foreground">{p.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{conn.provider_email}</p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px] py-0 px-2 font-medium">
                        Connected
                      </Badge>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg text-xs text-muted-foreground space-y-1.5">
                      <div className="flex justify-between">
                        <span>Sync Status:</span>
                        <span className="font-semibold text-emerald-500 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {conn.sync_status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Synced:</span>
                        <span className="font-medium text-foreground">
                          {new Date(conn.last_synced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/30">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-3 cursor-pointer" onClick={() => handleEdit(conn)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-3 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => handleReconnect(conn, `${p.name} (${conn.provider_email})`)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Reconnect
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-2 text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => handleDisconnect(conn.id, `${p.name} (${conn.provider_email})`)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Integrations Directory */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Integrations</h2>
        
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="w-full max-w-md grid grid-cols-3 bg-muted/60 p-1 rounded-xl mb-4">
            <TabsTrigger value="calendar" className="rounded-lg text-xs sm:text-sm font-medium py-1.5">Calendars</TabsTrigger>
            <TabsTrigger value="meeting" className="rounded-lg text-xs sm:text-sm font-medium py-1.5">Conferencing</TabsTrigger>
            <TabsTrigger value="productivity" className="rounded-lg text-xs sm:text-sm font-medium py-1.5">Productivity</TabsTrigger>
          </TabsList>

          {["calendar", "meeting", "productivity"].map((category) => (
            <TabsContent key={category} value={category} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers
                .filter((p) => p.category === category)
                .map((p) => (
                  <Card key={p.id} className="hover:shadow-sm transition-all duration-200 border border-border/50">
                    <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl bg-primary/10 ${p.color} shrink-0`}>
                            <p.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base text-foreground">{p.name}</h3>
                            <p className="text-xs text-muted-foreground">{category.charAt(0).toUpperCase() + category.slice(1)} Module</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Multiple accounts ok</span>
                        <Button size="sm" className="gradient-bg hover:opacity-90 px-4 text-xs font-semibold cursor-pointer h-8" onClick={() => handleConnect(p)}>
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* CONNECT / EDIT DIALOG */}
      <Dialog open={!!activeProvider} onOpenChange={() => setActiveProvider(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <span className={`p-1.5 rounded-lg bg-primary/10 ${activeProvider?.color}`}>
                {activeProvider && <activeProvider.icon className="h-5 w-5" />}
              </span>
              {editingConn ? "Edit" : "Connect"} {activeProvider?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-1.5">
              <Label htmlFor="provider_email">Account Email <span className="text-destructive">*</span></Label>
              <Input
                id="provider_email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Render inputs based on provider metadata capability */}
            {activeProvider?.id.includes("calendar") || activeProvider?.id === "outlook" || activeProvider?.id === "apple" || activeProvider?.id === "icloud" ? (
              <div className="space-y-1.5">
                <Label htmlFor="calendar_url">Calendar Feed / iCal URL (Optional)</Label>
                <Input
                  id="calendar_url"
                  placeholder="https://calendar.google.com/..."
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                />
              </div>
            ) : null}

            {activeProvider?.category === "meeting" ? (
              <div className="space-y-1.5">
                <Label htmlFor="meeting_url">Meeting / Conference URL (Optional)</Label>
                <Input
                  id="meeting_url"
                  placeholder="https://zoom.us/j/... or Meet link"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                />
              </div>
            ) : null}

            {activeProvider?.id === "webhook" ? (
              <div className="space-y-1.5">
                <Label htmlFor="webhook_url">Webhook Target URL</Label>
                <Input
                  id="webhook_url"
                  placeholder="https://yourcrm.com/incoming-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="api_key">API Key (Optional)</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Paste API Key if needed"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="oauth_token">OAuth / Access Token (Optional)</Label>
              <Input
                id="oauth_token"
                type="password"
                placeholder="Access Token if available"
                value={oauthToken}
                onChange={(e) => setOauthToken(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom_link">Custom Link / Slug (Optional)</Label>
              <Input
                id="custom_link"
                placeholder="e.g. meet/my-custom-room"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setActiveProvider(null)}>
              Cancel
            </Button>
            <Button className="gradient-bg hover:opacity-90 w-full sm:w-auto" onClick={handleSaveConnection} disabled={loading}>
              {loading ? "Saving..." : editingConn ? "Save Changes" : "Save Integration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
