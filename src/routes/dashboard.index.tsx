import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, CalendarPlus, Calendar, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState({ bookings: 0, events: 0, calendars: 0, team: 0 });

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [b, e, c, t] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "upcoming"),
        supabase.from("event_types").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("integrations").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("team_members").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      setCounts({ bookings: b.count || 0, events: e.count || 0, calendars: c.count || 0, team: t.count || 0 });
    }
    load();
  }, [user]);

  const stats = [
    { icon: CalendarCheck, label: "Upcoming Bookings", value: counts.bookings, color: "text-blue-400" },
    { icon: CalendarPlus, label: "Event Types", value: counts.events, color: "text-violet-400" },
    { icon: Calendar, label: "Connected Calendars", value: counts.calendars, color: "text-emerald-400" },
    { icon: Users, label: "Team Members", value: counts.team, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, <span className="gradient-text">{profile?.full_name || "User"}</span>!</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your scheduling activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10"><s.icon className={`h-6 w-6 ${s.color}`} /></div>
                <div>
                  <p className="text-3xl font-bold gradient-text">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Button className="gradient-bg hover:opacity-90" asChild>
          <a href="/dashboard/event-types">Create Event Type <ArrowRight className="ml-2 h-4 w-4" /></a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/dashboard/bookings">View Bookings</a>
        </Button>
      </div>
    </div>
  );
}
