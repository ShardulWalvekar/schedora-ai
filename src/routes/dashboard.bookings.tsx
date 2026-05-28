import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarCheck, Search, Plus, Calendar, Clock, Video, FileText, Trash2, Edit2, RotateCcw, AlertTriangle, User, Mail, Info, ExternalLink, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateMeetingLink, cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Tables<"bookings">[]>([]);
  const [eventTypes, setEventTypes] = useState<Tables<"event_types">[]>([]);
  
  // Integration loaded states
  const [calendarIntegrations, setCalendarIntegrations] = useState<Tables<"integrations">[]>([]);
  const [meetingIntegrations, setMeetingIntegrations] = useState<Tables<"integrations">[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal control states
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Active bookings for modals
  const [activeBooking, setActiveBooking] = useState<Tables<"bookings"> | null>(null);

  // Scheduling conflict state
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [alternativeSlots, setAlternativeSlots] = useState<string[]>([]);

  // Form states
  const [form, setForm] = useState({
    attendee_name: "",
    attendee_email: "",
    event_type: "",
    duration: 30,
    meeting_platform: "Google Meet",
    selected_calendar: "Default Calendar",
    booking_date: "",
    booking_time: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      loadBookings();
      loadEventTypes();
      loadIntegrations();
    }
  }, [user]);

  // Re-check conflicts when date, time, or duration changes in creation form
  useEffect(() => {
    if (form.booking_date && form.booking_time && createOpen) {
      checkConflicts();
    }
  }, [form.booking_date, form.booking_time, form.duration, createOpen]);

  async function loadBookings() {
    if (!user) return;
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });
    
    if (error) {
      toast.error("Failed to load bookings: " + error.message);
    } else if (data) {
      // Dynamic status adjustment based on date/time logic
      const now = new Date();
      const updatedBookings = data.map((b) => {
        if (b.status === "cancelled") return b;
        try {
          const bookingDateTime = new Date(`${b.booking_date}T${b.booking_time}`);
          const isBookingPast = bookingDateTime < now;
          const currentStatus = isBookingPast ? "past" : "upcoming";
          if (b.status !== currentStatus) {
            supabase.from("bookings").update({ status: currentStatus }).eq("id", b.id).then();
            return { ...b, status: currentStatus };
          }
        } catch (e) {}
        return b;
      });
      setBookings(updatedBookings);
    }
  }

  async function loadEventTypes() {
    if (!user) return;
    const { data } = await supabase
      .from("event_types")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);
    if (data) setEventTypes(data);
  }

  async function loadIntegrations() {
    if (!user) return;
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "connected");

    if (data) {
      const calendarList = data.filter((d) => 
        ["google_calendar", "outlook", "apple", "icloud"].includes(d.provider)
      );
      const meetingList = data.filter((d) => 
        ["zoom", "google_meet", "teams", "webex", "custom_link"].includes(d.provider)
      );
      setCalendarIntegrations(calendarList);
      setMeetingIntegrations(meetingList);
    }
  }

  // Conflict Checking Logic
  async function checkConflicts() {
    if (!user || !form.booking_date || !form.booking_time) return;
    
    const proposedStart = new Date(`${form.booking_date}T${form.booking_time}`);
    const proposedEnd = new Date(proposedStart.getTime() + form.duration * 60 * 1000);

    // 1. Check existing local bookings
    const conflictingBooking = bookings.find((b) => {
      if (b.status === "cancelled") return false;
      const start = new Date(`${b.booking_date}T${b.booking_time}`);
      const end = new Date(start.getTime() + b.duration * 60 * 1000);
      return proposedStart < end && proposedEnd > start;
    });

    if (conflictingBooking) {
      setConflictWarning(`Conflict detected with existing booking: "${conflictingBooking.event_type}" at ${conflictingBooking.booking_time}`);
      findAlternativeSlots(proposedStart);
      return;
    }

    // 2. Check external calendar synced events
    const { data: extEvents } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id);

    if (extEvents) {
      const conflictingExt = extEvents.find((ev) => {
        const start = new Date(ev.start_time);
        const end = new Date(ev.end_time);
        return proposedStart < end && proposedEnd > start;
      });

      if (conflictingExt) {
        setConflictWarning(`Conflict detected with synced calendar event: "${conflictingExt.title || "Busy"}"`);
        findAlternativeSlots(proposedStart);
        return;
      }
    }

    // No conflict
    setConflictWarning(null);
    setAlternativeSlots([]);
  }

  // Find Alternative free times in 30min increments
  function findAlternativeSlots(startObj: Date) {
    const slots: string[] = [];
    // Check next 6 slots of 30-min intervals
    for (let i = 1; i <= 6; i++) {
      const candidateStart = new Date(startObj.getTime() + i * 30 * 60 * 1000);
      const candidateEnd = new Date(candidateStart.getTime() + form.duration * 60 * 1000);

      // Check bookings conflict
      const isBookingConflict = bookings.some((b) => {
        if (b.status === "cancelled") return false;
        const start = new Date(`${b.booking_date}T${b.booking_time}`);
        const end = new Date(start.getTime() + b.duration * 60 * 1000);
        return candidateStart < end && candidateEnd > start;
      });

      if (!isBookingConflict) {
        const formattedTime = candidateStart.toTimeString().substring(0, 5); // HH:MM
        slots.push(formattedTime);
        if (slots.length >= 3) break;
      }
    }
    setAlternativeSlots(slots);
  }

  // Handle Event Type Selection to Autofill defaults
  function handleEventTypeChange(val: string) {
    const et = eventTypes.find((e) => e.title === val || e.slug === val);
    if (et) {
      setForm((prev) => ({
        ...prev,
        event_type: et.title,
        duration: et.duration,
        meeting_platform: et.platform || "Google Meet",
      }));
    } else {
      setForm((prev) => ({ ...prev, event_type: val }));
    }
  }

  // Actions
  async function handleCreateBooking() {
    if (!user) return;
    if (!form.attendee_name || !form.attendee_email || !form.booking_date || !form.booking_time || !form.event_type) {
      return toast.error("Please fill in attendee name, email, event type, date and time.");
    }

    // Force conflict block
    if (conflictWarning) {
      return toast.error("Time slot unavailable — existing meeting detected.");
    }
    
    setLoading(true);
    const now = new Date();
    const bookingDateTime = new Date(`${form.booking_date}T${form.booking_time}`);
    const status = bookingDateTime < now ? "past" : "upcoming";

    // Generate meeting link if platform connected
    const isConnected = meetingIntegrations.some(
      (mi) => mi.provider === form.meeting_platform.toLowerCase().replace(/\s+/g, "_")
    );
    const meeting_link = isConnected ? generateMeetingLink(form.meeting_platform, Math.random().toString(36).substring(2, 10)) : null;

    // 1. Create booking in Supabase
    const { data: newBooking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        attendee_name: form.attendee_name,
        attendee_email: form.attendee_email,
        event_type: form.event_type,
        duration: Number(form.duration),
        meeting_platform: form.meeting_platform,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        notes: form.notes,
        status,
        meeting_provider: form.meeting_platform,
        meeting_link,
        meeting_status: "ready"
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create booking: " + error.message);
      setLoading(false);
      return;
    }

    // 2. Sync to calendar_events
    const endDateTime = new Date(bookingDateTime.getTime() + Number(form.duration) * 60 * 1000);
    const { data: syncEvent } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      provider: form.selected_calendar === "Default Calendar" ? "Google Calendar" : form.selected_calendar,
      title: `${form.event_type} with ${form.attendee_name}`,
      start_time: bookingDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: "confirmed",
    }).select().single();

    // 3. Log Sync Activity
    // Find active integration matching selected calendar or default
    const matchingIntegration = calendarIntegrations.find((c) => c.provider_email === form.selected_calendar) || calendarIntegrations[0];
    if (matchingIntegration) {
      await supabase.from("integration_sync_logs").insert({
        integration_id: matchingIntegration.id,
        sync_status: "success",
        sync_message: `Created calendar event: ${form.event_type}`,
      });
    }

    toast.success("Booking created and synced successfully!");
    setCreateOpen(false);
    resetForm();
    loadBookings();
    setLoading(false);
  }

  async function handleUpdateBooking() {
    if (!activeBooking) return;
    if (!form.attendee_name || !form.attendee_email || !form.booking_date || !form.booking_time) {
      return toast.error("Please fill in all required fields.");
    }

    setLoading(true);
    const now = new Date();
    const bookingDateTime = new Date(`${form.booking_date}T${form.booking_time}`);
    const status = activeBooking.status === "cancelled" ? "cancelled" : (bookingDateTime < now ? "past" : "upcoming");

    const { error } = await supabase
      .from("bookings")
      .update({
        attendee_name: form.attendee_name,
        attendee_email: form.attendee_email,
        event_type: form.event_type,
        duration: Number(form.duration),
        meeting_platform: form.meeting_platform,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        notes: form.notes,
        status,
      })
      .eq("id", activeBooking.id);

    if (error) {
      toast.error("Failed to update booking: " + error.message);
    } else {
      toast.success("Booking updated successfully!");
      setEditOpen(false);
      if (activeBooking) {
        setActiveBooking({
          ...activeBooking,
          attendee_name: form.attendee_name,
          attendee_email: form.attendee_email,
          event_type: form.event_type,
          duration: Number(form.duration),
          meeting_platform: form.meeting_platform,
          booking_date: form.booking_date,
          booking_time: form.booking_time,
          notes: form.notes,
          status,
        });
      }
      loadBookings();
    }
    setLoading(false);
  }

  async function handleCancelBooking(id: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel booking: " + error.message);
    } else {
      toast.success("Booking marked as Cancelled.");
      if (activeBooking && activeBooking.id === id) {
        setActiveBooking({ ...activeBooking, status: "cancelled" });
      }
      loadBookings();
    }
  }

  async function handleRestoreBooking(id: string, date: string, time: string) {
    const now = new Date();
    const bookingDateTime = new Date(`${date}T${time}`);
    const status = bookingDateTime < now ? "past" : "upcoming";

    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to restore booking: " + error.message);
    } else {
      toast.success(`Booking restored to ${status}!`);
      if (activeBooking && activeBooking.id === id) {
        setActiveBooking({ ...activeBooking, status });
      }
      loadBookings();
    }
  }

  async function handleDeleteBooking(id: string) {
    setLoading(true);
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete booking: " + error.message);
    } else {
      toast.success("Booking permanently deleted.");
      setDeleteOpen(false);
      setDetailOpen(false);
      loadBookings();
    }
    setLoading(false);
  }

  function resetForm() {
    setForm({
      attendee_name: "",
      attendee_email: "",
      event_type: eventTypes[0]?.title || "Meeting",
      duration: eventTypes[0]?.duration || 30,
      meeting_platform: eventTypes[0]?.platform || "Google Meet",
      selected_calendar: "Default Calendar",
      booking_date: format(new Date(), "yyyy-MM-dd"),
      booking_time: "10:00",
      notes: "",
    });
    setConflictWarning(null);
    setAlternativeSlots([]);
  }

  function openCreateModal() {
    resetForm();
    setCreateOpen(true);
  }

  function openEditModal(booking: Tables<"bookings">) {
    setActiveBooking(booking);
    setForm({
      attendee_name: booking.attendee_name,
      attendee_email: booking.attendee_email,
      event_type: booking.event_type,
      duration: booking.duration,
      meeting_platform: booking.meeting_platform,
      selected_calendar: "Default Calendar",
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      notes: booking.notes || "",
    });
    setEditOpen(true);
  }

  function openDetailsModal(booking: Tables<"bookings">) {
    setActiveBooking(booking);
    setDetailOpen(true);
  }

  // Dynamic Join Meeting Helper URLs
  function getJoinMeetingUrl(platform: string, id: string) {
    const cleanId = id.substring(0, 8);
    switch (platform) {
      case "Zoom":
        return `https://zoom.us/j/89922460228?pwd=gHEZJ_${cleanId}`;
      case "Google Meet":
        return `https://meet.google.com/pgv-eqop-${cleanId}`;
      case "Microsoft Teams":
        return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${cleanId}`;
      case "Cisco Webex":
        return `https://cisco.webex.com/meet/room_${cleanId}`;
      default:
        return `https://meet.google.com/pgv-eqop-${cleanId}`;
    }
  }

  const filtered = bookings.filter(
    (b) =>
      b.attendee_name.toLowerCase().includes(search.toLowerCase()) ||
      b.attendee_email.toLowerCase().includes(search.toLowerCase()) ||
      b.event_type.toLowerCase().includes(search.toLowerCase())
  );

  const upcoming = filtered.filter((b) => b.status === "upcoming");
  const past = filtered.filter((b) => b.status === "past");
  const cancelled = filtered.filter((b) => b.status === "cancelled");

  // Format Helper
  function formatMeetingTime(dateStr: string, timeStr: string) {
    try {
      const dt = new Date(`${dateStr}T${timeStr}`);
      return format(dt, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  }

  function BookingCard({ b }: { b: Tables<"bookings"> }) {
    const { session } = useAuth();
    const [timeLeft, setTimeLeft] = useState<{
      label: string;
      countdown: string;
      canJoin: boolean;
      isPast: boolean;
    }>({ label: "Checking...", countdown: "", canJoin: false, isPast: false });

    useEffect(() => {
      function updateTimer() {
        if (b.status === "cancelled" || (b as any).meeting_status === "cancelled") {
          setTimeLeft({ label: "Cancelled", countdown: "", canJoin: false, isPast: false });
          return;
        }

        const start = new Date(`${b.booking_date}T${b.booking_time}`);
        const end = new Date(start.getTime() + b.duration * 60 * 1000);
        const now = new Date();

        if (now > end) {
          setTimeLeft({ label: "Meeting Ended", countdown: "Ended", canJoin: false, isPast: true });
          return;
        }

        const diffStartMs = start.getTime() - now.getTime();
        const isWithin10Min = diffStartMs <= 10 * 60 * 1000;

        if (now >= start && now <= end) {
          // Meeting is currently live
          setTimeLeft({
            label: "Join Meeting",
            countdown: "Live Now",
            canJoin: true,
            isPast: false
          });
        } else if (isWithin10Min) {
          // Within 10 minutes window before start
          const minsLeft = Math.ceil(diffStartMs / 60000);
          setTimeLeft({
            label: `Join Meeting`,
            countdown: `Starts in ${minsLeft}m`,
            canJoin: true,
            isPast: false
          });
        } else {
          // Before the 10 minutes window
          const totalMinsLeft = Math.floor(diffStartMs / 60000);
          const hrs = Math.floor(totalMinsLeft / 60);
          const mins = totalMinsLeft % 60;
          
          let countdownStr = "";
          let buttonLabel = "";
          if (hrs > 0) {
            countdownStr = `Starts in ${hrs}h ${mins}m`;
            buttonLabel = `Available in ${hrs}h ${mins}m`;
          } else {
            countdownStr = `Starts in ${mins}m`;
            buttonLabel = `Available in ${mins}m`;
          }

          setTimeLeft({
            label: buttonLabel,
            countdown: countdownStr,
            canJoin: false,
            isPast: false
          });
        }
      }

      updateTimer();
      const interval = setInterval(updateTimer, 5000);
      return () => clearInterval(interval);
    }, [b]);

    async function handleJoin() {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`/api/bookings/${b.id}/join`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.meeting_link) {
          window.open(data.meeting_link, "_blank");
        } else {
          toast.error(data.error || "Failed to join meeting");
        }
      } catch (err) {
        toast.error("An error occurred. Please try again.");
      }
    }

    return (
      <Card className="hover:shadow-sm transition-all duration-200 border border-border/50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-white shrink-0">
                {b.attendee_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate max-w-[200px]">{b.attendee_name}</h3>
                  <Badge variant={b.status === "upcoming" ? "success" : b.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px] py-0 px-2 font-medium">
                    {b.status}
                  </Badge>
                  {timeLeft.countdown && (
                    <Badge variant={timeLeft.countdown === "Live Now" ? "success" : timeLeft.countdown === "Ended" ? "secondary" : "outline"} className="text-[10px] py-0 px-2 font-medium">
                      {timeLeft.countdown}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[240px]">{b.attendee_email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{b.event_type}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.duration}m</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {b.meeting_platform}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{formatMeetingTime(b.booking_date, b.booking_time)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
              {b.status === "upcoming" && (
                <Button 
                  className={cn(
                    "text-xs px-3.5 h-8 font-semibold flex items-center gap-1 transition-opacity",
                    timeLeft.canJoin ? "gradient-bg hover:opacity-90 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed border border-border/40"
                  )} 
                  onClick={timeLeft.canJoin ? handleJoin : undefined}
                  disabled={!timeLeft.canJoin}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {timeLeft.label}
                </Button>
              )}
              {b.status === "past" && (
                <Button variant="outline" size="sm" className="text-xs px-3 h-8 font-medium cursor-not-allowed text-muted-foreground" disabled>
                  Meeting Ended
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs px-3 h-8 font-medium cursor-pointer" onClick={() => openDetailsModal(b)}>
                Details
              </Button>
              {b.status === "upcoming" ? (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => handleCancelBooking(b.id)}>
                  Cancel
                </Button>
              ) : b.status === "cancelled" ? (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:bg-primary/10 cursor-pointer" onClick={() => handleRestoreBooking(b.id, b.booking_date, b.booking_time)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function EmptyState({ msg }: { msg: string }) {
    return (
      <Card className="border border-dashed border-border/80">
        <CardContent className="p-12 text-center">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm font-medium">{msg}</p>
          <Button variant="outline" size="sm" className="mt-4 text-xs font-semibold cursor-pointer" onClick={openCreateModal}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Book a Meeting
          </Button>
        </CardContent>
      </Card>
    );
  }

  const allAvailablePlatforms = [
    "Google Meet",
    "Zoom",
    "Microsoft Teams",
    "Cisco Webex",
    "Custom Link",
  ];

  return (
    <div className="space-y-6 animate-fade-in px-4 sm:px-6 max-w-5xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage, create, and track scheduled meetings.</p>
        </div>
      </div>

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by name, email, or meeting..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg text-xs sm:text-sm font-medium py-1.5">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg text-xs sm:text-sm font-medium py-1.5">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg text-xs sm:text-sm font-medium py-1.5">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcoming.length === 0 ? <EmptyState msg="No upcoming meetings scheduled." /> : upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
        </TabsContent>
        <TabsContent value="past" className="space-y-4 mt-4">
          {past.length === 0 ? <EmptyState msg="No past meetings found." /> : past.map((b) => <BookingCard key={b.id} b={b} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="space-y-4 mt-4">
          {cancelled.length === 0 ? <EmptyState msg="No cancelled meetings." /> : cancelled.map((b) => <BookingCard key={b.id} b={b} />)}
        </TabsContent>
      </Tabs>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1">
            
            {/* Conflict Warnings */}
            {conflictWarning && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Time slot unavailable — existing meeting detected.</span>
                </div>
                <p className="text-muted-foreground">{conflictWarning}</p>
                {alternativeSlots.length > 0 && (
                  <div className="pt-2 border-t border-destructive/10">
                    <span className="font-semibold block mb-1.5 text-foreground">Suggested Available Times:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {alternativeSlots.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2.5 font-medium border-border/80 text-foreground cursor-pointer"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, booking_time: time }));
                            setConflictWarning(null);
                          }}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="guest_name">Attendee Name</Label>
                <Input id="guest_name" value={form.attendee_name} onChange={(e) => setForm({ ...form, attendee_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest_email">Attendee Email</Label>
                <Input id="guest_email" type="email" value={form.attendee_email} onChange={(e) => setForm({ ...form, attendee_email: e.target.value })} placeholder="john@example.com" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event_type">Event / Meeting Type</Label>
              <div className="flex gap-2">
                <Select value={form.event_type} onValueChange={handleEventTypeChange}>
                  <SelectTrigger id="event_type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.length === 0 && (
                      <SelectItem value="Meeting">Standard Meeting</SelectItem>
                    )}
                    {eventTypes.map((et) => (
                      <SelectItem key={et.id} value={et.title}>{et.title} ({et.duration}m)</SelectItem>
                    ))}
                    <SelectItem value="Custom">Custom Event Type...</SelectItem>
                  </SelectContent>
                </Select>
                {form.event_type === "Custom" && (
                  <Input 
                    placeholder="Enter custom type" 
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (Minutes)</Label>
                <Select value={String(form.duration)} onValueChange={(v) => setForm({ ...form, duration: Number(v) })}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="platform">Meeting Provider</Label>
                <Select value={form.meeting_platform} onValueChange={(v) => setForm({ ...form, meeting_platform: v })}>
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAvailablePlatforms.map((p) => {
                      const isConnected = meetingIntegrations.some(
                        (mi) => mi.provider === p.toLowerCase().replace(/\s+/g, "_")
                      );
                      return (
                        <SelectItem key={p} value={p}>
                          {p} {isConnected ? "✓" : "(Not Connected)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="target_calendar">Sync to Calendar</Label>
                <Select value={form.selected_calendar} onValueChange={(v) => setForm({ ...form, selected_calendar: v })}>
                  <SelectTrigger id="target_calendar">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Default Calendar">Default Calendar (Simulated)</SelectItem>
                    {calendarIntegrations.map((ci) => (
                      <SelectItem key={ci.id} value={ci.provider_email || ci.provider}>
                        {ci.provider_email} ({ci.provider.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={form.booking_time} onChange={(e) => setForm({ ...form, booking_time: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add meeting agenda or notes..." />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="gradient-bg hover:opacity-90 w-full sm:w-auto font-semibold" onClick={handleCreateBooking} disabled={loading || !!conflictWarning}>
              {loading ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between gap-4">
              <span>Booking Details</span>
              {activeBooking && (
                <Badge variant={activeBooking.status === "upcoming" ? "success" : activeBooking.status === "cancelled" ? "destructive" : "secondary"}>
                  {activeBooking.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {activeBooking && (
            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/30">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Attendee</p>
                    <p className="font-semibold text-foreground">{activeBooking.attendee_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-t border-border/30 pt-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">Email</p>
                    <p className="text-foreground">{activeBooking.attendee_email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">Meeting Type</span>
                    <span className="font-medium text-foreground">{activeBooking.event_type}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">Platform</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                      {activeBooking.meeting_platform}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">Date & Time</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      {formatMeetingTime(activeBooking.booking_date, activeBooking.booking_time)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">Duration</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      {activeBooking.duration} minutes
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Notes</span>
                  <div className="bg-card p-3 rounded-lg border border-border/60 text-muted-foreground min-h-[60px] whitespace-pre-line flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground/50 shrink-0" />
                    <span>{activeBooking.notes || "No notes provided."}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold cursor-pointer" onClick={() => openEditModal(activeBooking)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {activeBooking.status === "upcoming" && (
                    <Button className="gradient-bg hover:opacity-90 h-8 text-xs font-semibold cursor-pointer flex items-center gap-1" onClick={() => window.open(getJoinMeetingUrl(activeBooking.meeting_platform, activeBooking.id), "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5" /> Join Meeting
                    </Button>
                  )}
                  {activeBooking.status === "cancelled" ? (
                    <Button variant="default" size="sm" className="h-8 text-xs font-semibold gradient-bg hover:opacity-90 cursor-pointer" onClick={() => handleRestoreBooking(activeBooking.id, activeBooking.booking_date, activeBooking.booking_time)}>
                      Restore Booking
                    </Button>
                  ) : activeBooking.status === "upcoming" ? (
                    <Button variant="destructive" size="sm" className="h-8 text-xs font-semibold cursor-pointer" onClick={() => handleCancelBooking(activeBooking.id)}>
                      Cancel Booking
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_guest_name">Attendee Name</Label>
                <Input id="edit_guest_name" value={form.attendee_name} onChange={(e) => setForm({ ...form, attendee_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_guest_email">Attendee Email</Label>
                <Input id="edit_guest_email" type="email" value={form.attendee_email} onChange={(e) => setForm({ ...form, attendee_email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_event_type">Event / Meeting Type</Label>
              <Input id="edit_event_type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_duration">Duration (Minutes)</Label>
                <Select value={String(form.duration)} onValueChange={(v) => setForm({ ...form, duration: Number(v) })}>
                  <SelectTrigger id="edit_duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_platform">Meeting Platform</Label>
                <Select value={form.meeting_platform} onValueChange={(v) => setForm({ ...form, meeting_platform: v })}>
                  <SelectTrigger id="edit_platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allAvailablePlatforms.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_date">Date</Label>
                <Input id="edit_date" type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_time">Time</Label>
                <Input id="edit_time" type="time" value={form.booking_time} onChange={(e) => setForm({ ...form, booking_time: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea id="edit_notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="gradient-bg hover:opacity-90 w-full sm:w-auto" onClick={handleUpdateBooking} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-lg">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Delete Booking?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Are you sure you want to permanently delete this booking? This action cannot be undone.
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="w-full" onClick={() => activeBooking && handleDeleteBooking(activeBooking.id)} disabled={loading}>
              {loading ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
