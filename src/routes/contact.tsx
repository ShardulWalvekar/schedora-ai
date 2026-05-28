import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 animate-fade-in">Get in <span className="gradient-text">Touch</span></h1>
          <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: "0.1s" }}>Have a question or want to learn more? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="glass-card rounded-2xl p-8 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label htmlFor="name">Name</Label><Input id="name" placeholder="Your name" required className="mt-1.5" /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" required className="mt-1.5" /></div>
              </div>
              <div><Label htmlFor="subject">Subject</Label><Input id="subject" placeholder="How can we help?" required className="mt-1.5" /></div>
              <div><Label htmlFor="message">Message</Label><Textarea id="message" placeholder="Tell us more..." rows={5} required className="mt-1.5" /></div>
              <Button type="submit" className="w-full gradient-bg hover:opacity-90 h-11" disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>

          {/* Info */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            {[
              { icon: Mail, title: "Email", info: "hello@schedora.ai", sub: "We reply within 24 hours" },
              { icon: Phone, title: "Phone", info: "+1 (555) 123-4567", sub: "Mon-Fri, 9am-6pm EST" },
              { icon: MapPin, title: "Location", info: "San Francisco, CA", sub: "United States" },
            ].map((c) => (
              <div key={c.title} className="glass-card rounded-xl p-6 flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary"><c.icon className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-sm text-foreground">{c.info}</p>
                  <p className="text-xs text-muted-foreground">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
