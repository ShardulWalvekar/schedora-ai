import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/availability")({
  component: AvailabilityPage,
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
const BUFFERS = [0, 5, 10, 15, 30];

interface DaySettings { day_of_week: number; is_available: boolean; start_time: string; end_time: string; buffer_before: number; buffer_after: number; daily_limit: number; }

function AvailabilityPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<DaySettings[]>(DAYS.map((_, i) => ({ day_of_week: i, is_available: i >= 1 && i <= 5, start_time: "09:00", end_time: "17:00", buffer_before: 0, buffer_after: 0, daily_limit: 10 })));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("availability_settings").select("*").eq("user_id", user!.id).order("day_of_week");
    if (data && data.length > 0) {
      setDays(DAYS.map((_, i) => {
        const d = data.find((r) => r.day_of_week === i);
        return d ? { day_of_week: d.day_of_week, is_available: d.is_available, start_time: d.start_time, end_time: d.end_time, buffer_before: d.buffer_before, buffer_after: d.buffer_after, daily_limit: d.daily_limit } : days[i];
      }));
    }
  }

  function updateDay(index: number, updates: Partial<DaySettings>) {
    setDays((prev) => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  }

  async function save() {
    setSaving(true);
    for (const d of days) {
      await supabase.from("availability_settings").upsert({ user_id: user!.id, ...d, updated_at: new Date().toISOString() }, { onConflict: "user_id,day_of_week" });
    }
    toast.success("Availability saved!");
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability</h1>
          <p className="text-sm text-muted-foreground">Set your weekly schedule and booking preferences.</p>
        </div>
        <Button className="gradient-bg hover:opacity-90" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Weekly Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {days.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 py-3 border-b border-border last:border-0">
              <div className="w-28 flex items-center gap-3">
                <Switch checked={d.is_available} onCheckedChange={(v) => updateDay(i, { is_available: v })} />
                <span className="text-sm font-medium">{DAYS[i]}</span>
              </div>
              {d.is_available ? (
                <div className="flex items-center gap-2">
                  <Select value={d.start_time} onValueChange={(v) => updateDay(i, { start_time: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-muted-foreground">to</span>
                  <Select value={d.end_time} onValueChange={(v) => updateDay(i, { end_time: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unavailable</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <Label>Buffer Before (min)</Label>
            <Select value={String(days[0].buffer_before)} onValueChange={(v) => setDays((prev) => prev.map((d) => ({ ...d, buffer_before: Number(v) })))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{BUFFERS.map((b) => <SelectItem key={b} value={String(b)}>{b} min</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Label>Buffer After (min)</Label>
            <Select value={String(days[0].buffer_after)} onValueChange={(v) => setDays((prev) => prev.map((d) => ({ ...d, buffer_after: Number(v) })))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{BUFFERS.map((b) => <SelectItem key={b} value={String(b)}>{b} min</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Label>Daily Booking Limit</Label>
            <Input type="number" value={days[0].daily_limit} onChange={(e) => setDays((prev) => prev.map((d) => ({ ...d, daily_limit: Number(e.target.value) })))} className="mt-1.5" min={1} max={50} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
