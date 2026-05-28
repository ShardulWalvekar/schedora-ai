import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for getting started",
    features: ["1 event type", "10 bookings/month", "Basic availability", "Email notifications", "1 calendar connection"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    desc: "For professionals and growing teams",
    features: ["Unlimited event types", "500 bookings/month", "Team collaboration", "Priority support", "5 calendar connections", "Custom branding", "Buffer times & limits", "Analytics dashboard"],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "/month",
    desc: "For large teams and organizations",
    features: ["Everything in Pro", "Unlimited bookings", "Unlimited team members", "Custom integrations", "SSO & SAML", "Dedicated support", "SLA guarantee", "API access", "Audit logs"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 animate-fade-in">Simple, Transparent <span className="gradient-text">Pricing</span></h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>Choose the plan that fits your needs. Upgrade anytime.</p>
        </div>
      </section>
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border transition-all animate-slide-up ${plan.highlighted ? "border-primary glow glass-card relative" : "glass-card border-border"}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-xs font-semibold text-white">Popular</div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold gradient-text">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button className={`w-full h-11 ${plan.highlighted ? "gradient-bg hover:opacity-90" : ""}`} variant={plan.highlighted ? "default" : "outline"} asChild>
                <a href="/register">{plan.cta}</a>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
