import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Trash2, Mail, Copy, Send, Check, X, Shield, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { usePlanEnforcer } from "@/components/plan-enforcer";

export const Route = createFileRoute("/dashboard/team")({
  component: TeamPage,
});

function TeamPage() {
  const { user, session } = useAuth();
  const { checkPlanAccess } = usePlanEnforcer();
  const [team, setTeam] = useState<Tables<"teams"> | null>(null);
  const [members, setMembers] = useState<Tables<"team_members">[]>([]);
  const [invites, setInvites] = useState<Tables<"team_invites">[]>([]);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);

  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  
  const [selectedMember, setSelectedMember] = useState<Tables<"team_members"> | null>(null);
  const [selectedRole, setSelectedRole] = useState("member");

  const [loading, setLoading] = useState(false);

  // Load and setup 5-second polling interval for real-time dashboard updates
  useEffect(() => {
    if (user) {
      loadTeamData();
      const interval = setInterval(() => {
        loadTeamData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadTeamData() {
    if (!user) return;
    
    // 1. Load team owned by user
    let { data: teams } = await supabase
      .from("teams")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1);

    // If no owned team, try finding joined team
    if (!teams || teams.length === 0) {
      const { data: memberTeams } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("email", user.email || "")
        .limit(1);

      if (memberTeams && memberTeams.length > 0) {
        const { data: joinedTeams } = await supabase
          .from("teams")
          .select("*")
          .eq("id", memberTeams[0].team_id)
          .limit(1);
        teams = joinedTeams;
      }
    }

    if (teams && teams.length > 0) {
      const activeTeam = teams[0];
      setTeam(activeTeam);
      
      // Load Members
      const { data: mData } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", activeTeam.id);
      if (mData) setMembers(mData);

      // Load Invites
      const { data: iData } = await supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", activeTeam.id)
        .order("created_at", { ascending: false });
      if (iData) setInvites(iData);
    } else {
      setTeam(null);
      setMembers([]);
      setInvites([]);
    }
  }

  async function handleCreateTeam() {
    if (!user) return;
    if (!checkPlanAccess("team")) return;
    if (!teamForm.name) return toast.error("Team name is required");
    
    setLoading(true);
    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: teamForm.name,
        description: teamForm.description,
        owner_id: user.id,
      })
      .select()
      .single();

    if (teamError) {
      toast.error("Failed to create team: " + teamError.message);
      setLoading(false);
      return;
    }

    // Insert owner as team_member
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: newTeam.id,
      user_id: user.id,
      email: user.email || "",
      name: (user.user_metadata as any)?.full_name || "Owner",
      role: "owner",
      status: "active",
    });

    if (memberError) {
      toast.error("Failed to register owner: " + memberError.message);
    } else {
      toast.success("Team created successfully!");
      setCreateOpen(false);
      setTeamForm({ name: "", description: "" });
      loadTeamData();
    }
    setLoading(false);
  }

  async function handleSendInvite() {
    if (!user || !session || !team) return;
    if (!checkPlanAccess("team")) return;
    if (!inviteForm.email) return toast.error("Email is required");

    setLoading(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          teamId: team.id,
          email: inviteForm.email,
          role: inviteForm.role,
          baseUrl: window.location.origin,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.emailSent) {
          toast.success(`Invitation email sent to ${inviteForm.email}!`);
        } else {
          navigator.clipboard.writeText(data.inviteUrl);
          toast.warning(`Invitation created, but email could not be sent. Link copied to clipboard.`, {
            description: data.inviteUrl,
            duration: 10000,
          });
        }
        setInviteOpen(false);
        setInviteForm({ email: "", role: "member" });
        loadTeamData();
      } else {
        toast.error(data.error || "Failed to send invitation.");
      }
    } catch (err: any) {
      toast.error("An error occurred while creating invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    const { error } = await supabase.from("team_invites").delete().eq("id", inviteId);
    if (error) {
      toast.error("Failed to cancel invitation: " + error.message);
    } else {
      toast.success("Invitation removed.");
      loadTeamData();
    }
  }

  async function handleResendOrRegenerateInvite(invite: Tables<"team_invites">) {
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch("/api/team/resend-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          inviteId: invite.id,
          baseUrl: window.location.origin,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.emailSent) {
          toast.success(`Invitation email resent to ${invite.recipient_email}!`);
        } else {
          navigator.clipboard.writeText(data.inviteUrl);
          toast.warning(`Invitation regenerated! SMTP is not configured. Link copied to clipboard.`, {
            description: data.inviteUrl,
            duration: 10000,
          });
        }
        loadTeamData();
      } else {
        toast.error(data.error || "Failed to resend invitation.");
      }
    } catch (err: any) {
      toast.error("An error occurred while resending invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) {
      toast.error("Failed to remove member: " + error.message);
    } else {
      toast.success("Member removed from team.");
      loadTeamData();
    }
  }

  function openEditRole(member: Tables<"team_members">) {
    setSelectedMember(member);
    setSelectedRole(member.role);
    setEditRoleOpen(true);
  }

  async function handleSaveRole() {
    if (!selectedMember) return;
    setLoading(true);
    
    const { error } = await supabase
      .from("team_members")
      .update({ role: selectedRole })
      .eq("id", selectedMember.id);

    if (error) {
      toast.error("Failed to update role: " + error.message);
    } else {
      toast.success("Member role updated.");
      setEditRoleOpen(false);
      loadTeamData();
    }
    setLoading(false);
  }

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const acceptedInvites = invites.filter((i) => i.status === "accepted");
  const inactiveInvites = invites.filter((i) => i.status === "declined" || i.status === "expired");

  if (!team) {
    return (
      <div className="space-y-6 animate-fade-in px-4 sm:px-6 max-w-4xl mx-auto py-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="h-16 w-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-6 shadow-md">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">No team yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Create a team workspace to invite your colleagues, share schedules, and coordinate bookings.
          </p>
          <Button 
            className="gradient-bg hover:opacity-90 font-medium cursor-pointer shadow-sm px-6" 
            onClick={() => {
              if (checkPlanAccess("team")) {
                setCreateOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Create Workspace Team
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md w-[95vw] rounded-xl text-left">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create Team Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="team_name">Team Name</Label>
                <Input
                  id="team_name"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team_desc">Description (Optional)</Label>
                <Textarea
                  id="team_desc"
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  placeholder="Describe this workspace..."
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="gradient-bg hover:opacity-90 w-full sm:w-auto" onClick={handleCreateTeam} disabled={loading}>
                {loading ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in px-4 sm:px-6 max-w-4xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{team.description || "Workspace members and team permissions."}</p>
        </div>
        {isOwnerOrAdmin && (
          <Button 
            className="gradient-bg hover:opacity-90 self-start sm:self-center font-medium cursor-pointer" 
            onClick={() => {
              if (checkPlanAccess("team")) {
                setInviteOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Invite Member
          </Button>
        )}
      </div>

      {/* ACTIVE MEMBERS CARD */}
      <Card className="border border-border/50">
        <CardHeader className="p-4 sm:p-5 border-b border-border/40">
          <CardTitle className="text-lg font-semibold">Workspace Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border/30">
          {members.map((m) => {
            const isSelf = m.user_id === user?.id;
            return (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors duration-150">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0 border border-border/40">
                    <AvatarFallback className="bg-primary/5 text-primary text-sm font-semibold">
                      {(m.name || m.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground flex items-center gap-1.5">
                      {m.name || "Workspace Member"}
                      {isSelf && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">You</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={m.role === "owner" ? "default" : m.role === "admin" ? "secondary" : "outline"} className="capitalize py-0.5 px-2 text-[10px]">
                    {m.role}
                  </Badge>
                  {isOwnerOrAdmin && m.role !== "owner" && !isSelf && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditRole(m)} title="Change Role">
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveMember(m.id)} title="Remove Member">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* PENDING INVITES */}
      {pendingInvites.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40">
            <CardTitle className="text-base font-semibold">Pending Invitations ({pendingInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{inv.recipient_email}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>Invited as <span className="font-semibold capitalize text-foreground">{inv.role}</span></span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> Expires {format(parseISO(inv.expires_at), "MMM d")}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge variant="warning" className="text-[10px] py-0.5 px-2">Pending</Badge>
                  {isOwnerOrAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2 cursor-pointer flex items-center gap-1" onClick={() => {
                        const url = `${window.location.origin}/invite/${inv.invite_token}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copied!");
                      }}>
                        <Copy className="h-3.5 w-3.5" /> Copy Link
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleResendOrRegenerateInvite(inv)} title="Resend Invitation">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleCancelInvite(inv.id)} title="Remove / Cancel">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ACCEPTED INVITES LOG (LIFECYCLE SUMMARY) */}
      {acceptedInvites.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40">
            <CardTitle className="text-base font-semibold text-muted-foreground">Accepted Invitations ({acceptedInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {acceptedInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{inv.recipient_email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Joined as <span className="font-semibold capitalize text-foreground">{inv.role}</span>
                      {inv.accepted_at && ` • ${format(parseISO(inv.accepted_at), "MMM d, h:mm a")}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-[10px] py-0.5 px-2">Accepted</Badge>
                  {isOwnerOrAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleCancelInvite(inv.id)} title="Delete Log">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DECLINED OR EXPIRED INVITES */}
      {inactiveInvites.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40">
            <CardTitle className="text-base font-semibold text-muted-foreground">Inactive / Expired Invitations ({inactiveInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {inactiveInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    {inv.status === "expired" ? <Clock className="h-4 w-4 text-amber-500" /> : <X className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{inv.recipient_email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Invited as <span className="font-semibold capitalize">{inv.role}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === "expired" ? "warning" : "destructive"} className="text-[10px] py-0.5 px-2 capitalize">
                    {inv.status}
                  </Badge>
                  {isOwnerOrAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleResendOrRegenerateInvite(inv)} title="Re-invite / Regenerate link">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleCancelInvite(inv.id)} title="Delete invitation log">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* INVITE DIALOG */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite_email">Email Address</Label>
              <Input
                id="invite_email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite_role">Role</Label>
              <Select value={inviteForm.role} onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}>
                <SelectTrigger id="invite_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button className="gradient-bg hover:opacity-90 w-full sm:w-auto font-semibold" onClick={handleSendInvite} disabled={loading}>
              {loading ? "Creating..." : "Create & Copy Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT ROLE DIALOG */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Member Role</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/30 text-xs">
                <p className="font-semibold text-foreground">{selectedMember.name || "Workspace Member"}</p>
                <p className="text-muted-foreground">{selectedMember.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member_role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="member_role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={() => setEditRoleOpen(false)}>Cancel</Button>
            <Button className="gradient-bg hover:opacity-90 w-full" onClick={handleSaveRole} disabled={loading}>
              {loading ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
