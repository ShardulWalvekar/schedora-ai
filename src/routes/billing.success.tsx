import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/billing/success")({
  component: BillingSuccessPage,
});

function BillingSuccessPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activatedPlan, setActivatedPlan] = useState<string>("pro");

  // Get search params for mock session validation
  const searchParams = new URLSearchParams(window.location.search);
  const planParam = searchParams.get("plan") || "pro";

  useEffect(() => {
    async function activateMockUpgrade() {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        // Trigger mock-success endpoint to update local Supabase DB
        const res = await fetch("/api/billing/mock-success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan: planParam }),
        });

        if (res.ok) {
          setActivatedPlan(planParam);
          toast.success(`Subscription upgraded to ${planParam}!`);
        }
      } catch (err) {
        console.error("Mock upgrade failed", err);
      } finally {
        setLoading(false);
      }
    }

    // Delay slightly for premium experience
    const timer = setTimeout(() => {
      activateMockUpgrade();
    }, 1500);

    return () => clearTimeout(timer);
  }, [session, planParam]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-24 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

      <Card className="max-w-md w-full border border-border/60 shadow-lg relative overflow-hidden bg-card/65 backdrop-blur-xl">
        <CardContent className="p-8 text-center space-y-6">
          {loading ? (
            <div className="space-y-4 py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Confirming your subscription status...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="relative inline-flex">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-ping" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Subscription Activated!</h1>
                <p className="text-sm text-muted-foreground px-2">
                  Thank you for upgrading to Schedora <span className="text-foreground font-semibold capitalize">{activatedPlan}</span>. Your premium access limits and features are now fully enabled.
                </p>
              </div>

              <div className="bg-muted/40 p-4 rounded-xl border border-border/30 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-semibold">{session?.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier Status:</span>
                  <span className="font-semibold text-emerald-500 capitalize">{activatedPlan} (Active)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Cycle:</span>
                  <span className="font-semibold">Monthly Subscription</span>
                </div>
              </div>

              <Button 
                className="w-full gradient-bg hover:opacity-90 font-semibold cursor-pointer h-11 flex items-center justify-center gap-1.5" 
                onClick={() => navigate({ to: "/dashboard" })}
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
