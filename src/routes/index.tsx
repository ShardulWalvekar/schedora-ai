import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Clock,
  Globe,
  Shield,
  Zap,
  ArrowRight,
  Star,
  CheckCircle,
} from "lucide-react";

export const Route = createFileRoute("/")(  {
  component: LandingPage,
});

const features = [
  { icon: Calendar, title: "Smart Scheduling", desc: "Create custom event types with flexible duration, location, and availability rules." },
  { icon: Users, title: "Team Collaboration", desc: "Invite team members, assign roles, and manage group scheduling effortlessly." },
  { icon: Clock, title: "Time Management", desc: "Set buffer times, daily limits, and working hours to protect your focus." },
  { icon: Globe, title: "Global Time Zones", desc: "Automatic timezone detection and conversion for international meetings." },
  { icon: Shield, title: "Secure & Private", desc: "Enterprise-grade security with row-level access controls and encrypted data." },
  { icon: Zap, title: "Lightning Fast", desc: "Instant booking confirmations with real-time calendar synchronization." },
];

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "500K+", label: "Meetings Booked" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9", label: "User Rating", icon: Star },
];

const steps = [
  { num: "01", title: "Create Your Events", desc: "Set up event types with custom durations, locations, and descriptions." },
  { num: "02", title: "Share Your Link", desc: "Send your personalized booking page to clients and colleagues." },
  { num: "03", title: "Get Booked", desc: "Guests pick a time that works, and you both get instant confirmation." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 text-sm text-muted-foreground mb-8 animate-fade-in">
            <Zap className="h-4 w-4 text-primary" />
            AI-Powered Scheduling Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6 animate-slide-up">
            Scheduling Made{" "}
            <span className="gradient-text">Effortless</span>
            <br />
            for Modern Teams
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Create event types, share your booking link, and let your guests schedule
            meetings — no back-and-forth emails required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button size="lg" className="gradient-bg hover:opacity-90 text-base px-8 h-12" asChild>
              <a href="/register">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
              <a href="/features">See How It Works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-border/50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {["Acme Corp", "TechFlow", "Quantum", "NovaStar", "Hyperion"].map((name) => (
              <span key={name} className="text-lg font-semibold text-muted-foreground/60">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to <span className="gradient-text">Schedule Smarter</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to eliminate scheduling friction and help your team focus on what matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-extrabold gradient-text flex items-center justify-center gap-1">
                {s.value}
                {s.icon && <s.icon className="h-6 w-6 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get up and running in minutes — no complex setup required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.num} className="relative glass-card rounded-xl p-8 text-center animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
                <span className="text-5xl font-extrabold gradient-text opacity-30">{step.num}</span>
                <h3 className="text-xl font-semibold mt-4 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Loved by <span className="gradient-text">Teams Everywhere</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Sarah Chen", role: "Product Lead at TechFlow", quote: "Schedora completely transformed how our team handles client meetings. We saved hours every week." },
              { name: "Marcus Johnson", role: "Founder at NovaStar", quote: "The team scheduling features are incredible. Our coordination improved dramatically overnight." },
              { name: "Emily Rivera", role: "VP Engineering at Quantum", quote: "Clean interface, powerful features, and excellent reliability. Exactly what we needed." },
            ].map((t, i) => (
              <div key={t.name} className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center glass-card rounded-2xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg opacity-10" />
          <div className="relative">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Transform Your Scheduling?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of teams who have streamlined their meeting workflow with Schedora.
            </p>
            <Button size="lg" className="gradient-bg hover:opacity-90 text-base px-8 h-12" asChild>
              <a href="/register">
                Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
