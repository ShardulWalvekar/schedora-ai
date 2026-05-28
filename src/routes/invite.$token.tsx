import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"pending" | "accepted" | "declined" | "error" | "expired">("pending");

  useEffect(() => {
    loadInvitation();
  }, [token]);

  async function loadInvitation() {
    const { data, error } = await supabase
      .from("team_invites")
      .select("*, teams(name)")
      .eq("invite_token", token)
      .single() as any;

    if (error || !data) {
      setStatus("error");
    } else {
      setInvitation(data);
      setTeamName(data.teams?.name || "Unknown Team");
      
      // Check expiration
      const isExpired = new Date(data.expires_at) < new Date();
      if (isExpired && data.status === "pending") {
        setStatus("expired");
        // Update in DB
        await supabase.from("team_invites").update({ status: "expired" }).eq("id", data.id);
      } else {
        setStatus(data.status as any);
      }
    }
    setLoading(false);
  }

  async function accept() {
    if (!invitation) return;
    setLoading(true);

    const nowStr = new Date().toISOString();

    // 1. Update status in team_invites to 'accepted' and set accepted_at
    const { error: inviteError } = await supabase
      .from("team_invites")
      .update({ 
        status: "accepted",
        accepted_at: nowStr
      })
      .eq("id", invitation.id);

    if (inviteError) {
      toast.error("Failed to accept invitation: " + inviteError.message);
      setLoading(false);
      return;
    }

    // 2. Insert into team_members
    const name = user
      ? ((user.user_metadata as any)?.full_name || user.email?.split("@")[0])
      : invitation.recipient_email.split("@")[0];

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: invitation.team_id,
      user_id: user?.id || null,
      email: invitation.recipient_email,
      name,
      role: invitation.role,
      status: "active",
      joined_at: nowStr,
    });

    if (memberError) {
      toast.error("Failed to join team: " + memberError.message);
    } else {
      toast.success("Welcome to the team!");
      setStatus("accepted");
    }
    setLoading(false);
  }

  async function decline() {
    if (!invitation) return;
    setLoading(true);
    const nowStr = new Date().toISOString();
    
    const { error } = await supabase
      .from("team_invites")
      .update({ 
        status: "declined",
        declined_at: nowStr
      })
      .eq("id", invitation.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Invitation declined");
      setStatus("declined");
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <Card className="max-w-md w-full border border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-8 text-center space-y-5">
          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Invalid Invitation</h2>
              <p className="text-muted-foreground text-sm">
                This invitation link is invalid or has been deleted.
              </p>
            </div>
          )}

          {status === "expired" && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Invitation Expired</h2>
              <p className="text-muted-foreground text-sm">
                This invitation link has expired. Please contact the owner to regenerate it.
              </p>
            </div>
          )}

          {status === "accepted" && (
            <div className="space-y-5">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-foreground">You've Joined!</h2>
              <p className="text-muted-foreground text-sm">
                You are now a member of <strong>{teamName}</strong>.
              </p>
              <Button className="gradient-bg hover:opacity-90 font-medium w-full" asChild>
                <a href="/dashboard/team">Go to Workspace</a>
              </Button>
            </div>
          )}

          {status === "declined" && (
            <div className="space-y-4">
              <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Invitation Declined</h2>
              <p className="text-muted-foreground text-sm">
                You've declined the invitation to join <strong>{teamName}</strong>.
              </p>
            </div>
          )}

          {status === "pending" && invitation && (
            <div className="space-y-5 text-center">
              <div className="h-16 w-16 rounded-full gradient-bg flex items-center justify-center mx-auto shadow-md">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Team Workspace Invitation</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  You have been invited to join <strong>{teamName}</strong>
                </p>
              </div>

              <div className="bg-muted/40 rounded-xl p-4 text-xs space-y-2.5 text-left border border-border/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Role:</span>
                  <Badge variant="secondary" className="capitalize text-[10px] py-0 px-2 font-medium">
                    {invitation.role}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invite Sent To:</span>
                  <span className="font-semibold text-foreground truncate max-w-[200px]">{invitation.recipient_email}</span>
                </div>
              </div>

              {!user && (
                <div className="bg-amber-500/10 text-amber-600 rounded-xl p-3 text-xs flex gap-2 text-left border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Note:</span> You are not logged in. We'll join using a guest profile. You can log in first for full access.
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 cursor-pointer" onClick={decline}>
                  Decline
                </Button>
                <Button className="flex-1 gradient-bg hover:opacity-90 cursor-pointer font-medium" onClick={accept}>
                  Accept & Join
                </Button>
              </div>

              {!user && (
                <p className="text-xs text-muted-foreground pt-1">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline font-semibold flex items-center justify-center gap-1 mt-1">
                    <LogIn className="h-3 w-3" /> Log In
                  </a>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
