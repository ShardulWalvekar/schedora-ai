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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Copy, Pencil, Trash2, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { usePlanEnforcer } from "@/components/plan-enforcer";

export const Route = createFileRoute("/dashboard/event-types")({
  component: EventTypesPage,
});

const COLORS = ["#6d5ce7", "#a855f7", "#ec4899", "#06b6d4", "#10b981", "#f59e0b"];
const LOCATIONS = ["Google Meet", "Zoom", "Phone Call", "In Person"];
const DURATIONS = [15, 30, 45, 60];

function EventTypesPage() {
  const { user, profile } = useAuth();
  const { checkPlanAccess } = usePlanEnforcer();
  const [events, setEvents] = useState<Tables<"event_types">[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"event_types"> | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", description: "", duration: 30, location: "Google Meet", color: COLORS[0], is_active: true, is_paid: false, price: 0 });

  useEffect(() => { if (user) loadEvents(); }, [user]);

  async function loadEvents() {
    const { data } = await supabase.from("event_types").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setEvents(data);
  }

  function openCreate() {
    if (!checkPlanAccess("event_type")) return;
    setEditing(null);
    setForm({ title: "", slug: "", description: "", duration: 30, location: "Google Meet", color: COLORS[0], is_active: true, is_paid: false, price: 0 });
    setOpen(true);
  }

  function openEdit(e: Tables<"event_types">) {
    setEditing(e);
    setForm({ title: e.title, slug: e.slug, description: e.description || "", duration: e.duration, location: e.location, color: e.color, is_active: e.is_active, is_paid: e.is_paid || false, price: e.price || 0 });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.title || !form.slug) return toast.error("Title and slug are required");
    if (form.is_paid && (!form.price || form.price <= 0)) {
      return toast.error("Paid meetings require a price greater than $0.00.");
    }
    if (editing) {
      const { error } = await supabase.from("event_types").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Event type updated");
    } else {
      const { error } = await supabase.from("event_types").insert({ ...form, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Event type created");
    }
    setOpen(false);
    loadEvents();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("event_types").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Event type deleted");
    loadEvents();
  }

  async function handleToggle(id: string, active: boolean) {
    await supabase.from("event_types").update({ is_active: active }).eq("id", id);
    loadEvents();
  }

  async function handleDuplicate(e: Tables<"event_types">) {
    if (!checkPlanAccess("event_type")) return;
    
    const uniqueSlug = `${e.slug}-dup-${Date.now().toString().slice(-4)}`;
    const duplicatedEvent = {
      user_id: user!.id,
      title: `${e.title} (Copy)`,
      description: e.description,
      duration: e.duration,
      location: e.location,
      color: e.color,
      slug: uniqueSlug,
      is_active: e.is_active,
      is_paid: e.is_paid || false,
      price: e.price || 0
    };

    const { error } = await supabase.from("event_types").insert(duplicatedEvent);
    if (error) return toast.error("Failed to duplicate: " + error.message);
    toast.success("Event type duplicated successfully");
    loadEvents();
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/${profile?.username || "user"}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied!");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Types</h1>
          <p className="text-sm text-muted-foreground">Create and manage your scheduling event types.</p>
        </div>
        <Button className="gradient-bg hover:opacity-90" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Create Event Type</Button>
      </div>

      {events.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><p className="text-muted-foreground">No event types yet. Create your first one!</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((e) => (
            <Card key={e.id} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: e.color }} />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{e.title}</h3>
                    {e.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                  </div>
                  <Switch checked={e.is_active} onCheckedChange={(v) => handleToggle(e.id, v)} />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.duration} min</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>
                  </div>
                  {e.is_paid ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold text-xs py-0.5 px-2">
                      ${e.price}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs py-0.5 px-2">Free</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyLink(e.slug)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy Link</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(e)} title="Duplicate Template"><Copy className="h-3.5 w-3.5 text-primary" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete event type?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{e.title}" and all associated bookings.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(e.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Event Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} className="mt-1.5" placeholder="30 Minute Meeting" /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1.5" placeholder="30-minute-meeting" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" placeholder="Optional description..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Select value={String(form.duration)} onValueChange={(v) => setForm({ ...form, duration: Number(v) })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1.5">
                {COLORS.map((c) => (
                  <button key={c} className={`h-8 w-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : ""}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            
            <div className="border-t border-border/40 my-3 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Paid Meeting</Label>
                  <p className="text-[11px] text-muted-foreground">Charge clients before booking a slot.</p>
                </div>
                <Switch checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
              </div>
              
              {form.is_paid && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    min="1" 
                    step="0.01" 
                    placeholder="25.00" 
                    value={form.price || ""} 
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} 
                    required 
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-bg hover:opacity-90" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
