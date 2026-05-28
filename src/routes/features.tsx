import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Calendar, Users, Clock, Globe, Shield, Zap, Link2, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});

const features = [
  { icon: Calendar, title: "Smart Event Types", desc: "Create unlimited event types with custom durations, locations, and descriptions. Support for one-on-one, group, and round-robin meetings." },
  { icon: Users, title: "Team Scheduling", desc: "Invite team members, manage roles, and coordinate group availability. Round-robin assignment ensures fair distribution." },
  { icon: Clock, title: "Availability Controls", desc: "Set working hours per day, buffer times between meetings, and daily booking limits. Prevent burnout with smart controls." },
  { icon: Globe, title: "Calendar Integrations", desc: "Sync with Google Calendar, Zoom, Outlook, Apple Calendar, and Google Meet. Prevent double bookings automatically." },
  { icon: Shield, title: "Enterprise Security", desc: "Row-level security policies, encrypted data at rest, and SOC 2 compliant infrastructure. Your data stays safe." },
  { icon: Zap, title: "Instant Notifications", desc: "Real-time booking confirmations via email. Automatic calendar invites with meeting links for all participants." },
  { icon: Link2, title: "Shareable Booking Links", desc: "Each event type gets a unique, branded booking page. Embed on your website or share via email and social." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track booking trends, popular event types, and team utilization. Data-driven insights to optimize your schedule." },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 animate-fade-in">Powerful <span className="gradient-text">Features</span></h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>Everything you need to manage your schedule professionally.</p>
        </div>
      </section>
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((f, i) => (
            <div key={f.title} className="glass-card rounded-xl p-8 hover:border-primary/30 transition-all animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4"><f.icon className="h-6 w-6" /></div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
