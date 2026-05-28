import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Heart, Lightbulb, Target } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const team = [
  { name: "Alex Morgan", role: "CEO & Co-Founder", color: "bg-violet-500" },
  { name: "Jordan Lee", role: "CTO & Co-Founder", color: "bg-blue-500" },
  { name: "Sam Rivera", role: "Head of Design", color: "bg-pink-500" },
  { name: "Casey Wu", role: "Lead Engineer", color: "bg-emerald-500" },
];

const values = [
  { icon: Lightbulb, title: "Innovation", desc: "We constantly push boundaries to build smarter scheduling solutions." },
  { icon: Heart, title: "Simplicity", desc: "Complex technology should feel effortless. We obsess over user experience." },
  { icon: Target, title: "Reliability", desc: "Your schedule is critical. We guarantee 99.9% uptime and data integrity." },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 animate-fade-in">About <span className="gradient-text">Schedora</span></h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
            We're on a mission to eliminate the friction of scheduling so teams can focus on what truly matters.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-3xl mx-auto glass-card rounded-2xl p-8 text-center animate-slide-up">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Schedora was born from a simple frustration: scheduling meetings shouldn't require a dozen emails.
            We built an AI-powered platform that handles the complexity of availability, time zones, and team coordination —
            so you can spend less time organizing and more time doing great work.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Meet the <span className="gradient-text">Team</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((m, i) => (
              <div key={m.name} className="glass-card rounded-xl p-6 text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`h-16 w-16 rounded-full ${m.color} flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4`}>
                  {m.name.charAt(0)}
                </div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-muted-foreground">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto pt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our <span className="gradient-text">Values</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <div key={v.title} className="glass-card rounded-xl p-8 text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4"><v.icon className="h-6 w-6" /></div>
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
