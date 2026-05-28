import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, CreditCard, Sparkles, RefreshCw, Calendar, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StripeElementsForm } from "@/components/stripe-elements-form";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

const pricingPlans = [
  { id: "free", name: "Free", price: "$0", period: "forever", features: ["1 event type", "10 bookings/mo", "Basic availability"] },
  { id: "pro", name: "Pro", price: "$12", period: "/month", features: ["Unlimited events", "500 bookings/mo", "Team collaboration", "Analytics", "Priority support"] },
  { id: "enterprise", name: "Enterprise", price: "$49", period: "/month", features: ["Everything in Pro", "Unlimited bookings", "Custom integrations", "SSO", "Dedicated support"] },
];

function BillingPage() {
  const { session } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "enterprise" | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (session?.access_token) {
      loadBillingData();
    }
  }, [session]);

  async function loadBillingData() {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      // 1. Fetch Subscription details
      const subRes = await fetch("/api/billing/subscription", { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSub(subData.subscription);
      }

      // 2. Fetch Usage details
      const usageRes = await fetch("/api/billing/usage", { headers });
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData);
      }

      // 3. Fetch Invoices list
      const invRes = await fetch("/api/billing/invoices", { headers });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
    } catch (err) {
      toast.error("Failed to load billing metrics");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanAction(planId: string) {
    if (planId === "free") return;
    setCheckoutPlan(planId as any);
  }

  async function handleManageSubscription() {
    if (!session?.access_token || !sub?.stripe_customer_id) return;
    setActionLoading("portal");

    try {
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        if (data.isMock) {
          toast.success("Sandbox Mock Portal: Simulating subscription cancel/resume");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          window.location.href = data.url;
        }
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch (err) {
      toast.error("Failed to connect to billing portal");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <LoaderSpinner />
      </div>
    );
  }

  const currentPlan = sub?.subscription_plan || sub?.plan || "free";
  const subStatus = sub?.subscription_status || sub?.status || "active";
  const isFreePlan = currentPlan === "free";

  // Calculate usage percentages
  const etUsed = usage?.eventTypesUsed || 0;
  const etLimit = usage?.eventTypesLimit || 1;
  const bkUsed = usage?.bookingsUsed || 0;
  const bkLimit = usage?.bookingsLimit || 10;

  const etPct = Math.min((etUsed / etLimit) * 100, 100);
  const bkPct = Math.min((bkUsed / bkLimit) * 100, 100);

  // Parse subscription timelines
  const nextRenewalDate = sub?.subscription_end 
    ? new Date(sub.subscription_end).toLocaleDateString(undefined, { dateStyle: "long" })
    : new Date(Date.now() + 30 * 86400000).toLocaleDateString(undefined, { dateStyle: "long" });

  const startTimelineDate = sub?.subscription_start
    ? new Date(sub.subscription_start).toLocaleDateString(undefined, { dateStyle: "medium" })
    : new Date().toLocaleDateString(undefined, { dateStyle: "medium" });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto px-1 py-1">
      {/* Test Mode Ribbon */}
      {usage?.isStripeTestMode && (
        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs">
          <div className="flex gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold">Stripe Sandbox Active (Test Mode)</span>
              <p className="text-muted-foreground mt-0.5">Use card number <span className="font-semibold text-foreground">4242 4242 4242 4242</span> to perform mock checkout subscriptions.</p>
            </div>
          </div>
          <Badge variant="warning" className="uppercase text-[9px] font-bold px-2 py-0.5">Test Mode</Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tiers, track monthly usage quotas, and download invoices.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 px-3 text-xs cursor-pointer self-start sm:self-center" onClick={loadBillingData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <Card className="lg:col-span-2 border border-border/50 bg-card/45 backdrop-blur">
          <CardHeader className="border-b border-border/30 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Active Plan
              </CardTitle>
              <Badge variant={subStatus === "active" ? "success" : "warning"} className="capitalize text-[10px] px-2 py-0.5">
                {subStatus}
              </Badge>
            </div>
            <CardDescription className="text-xs">Your current active subscription parameters.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold capitalize gradient-text">{currentPlan} Plan</span>
              <span className="text-sm text-muted-foreground">
                {isFreePlan ? "$0 forever" : currentPlan === "pro" ? "$12 / month" : "$49 / month"}
              </span>
            </div>

            {/* Quota Progress Bars */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Active Event Types</span>
                  <span className="text-foreground">{etUsed} / {etLimit === 9999 ? "Unlimited" : etLimit} used</span>
                </div>
                <Progress value={etPct} className="h-2 bg-muted/60" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Monthly Bookings Limit</span>
                  <span className="text-foreground">{bkUsed} / {bkLimit === 99999 ? "Unlimited" : bkLimit} used</span>
                </div>
                <Progress value={bkPct} className="h-2 bg-muted/60" />
              </div>
            </div>

            {/* Renewal Timelines */}
            {!isFreePlan && (
              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/30 text-xs flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-muted-foreground">Next Renewal</p>
                    <p className="font-semibold text-foreground mt-0.5">{nextRenewalDate}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="h-8 text-xs font-semibold px-3 cursor-pointer gradient-bg hover:opacity-90"
                  onClick={handleManageSubscription}
                  disabled={actionLoading === "portal"}
                >
                  {actionLoading === "portal" ? "Redirecting..." : "Manage Subscription"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices and Timeline Timeline */}
        <Card className="border border-border/50 bg-card/45 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-primary" /> Billing Timeline
            </CardTitle>
            <CardDescription className="text-xs">Timeline of subscription actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="relative border-l border-border/80 pl-4 ml-2 space-y-5">
              {/* Point 1 */}
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <p className="font-semibold text-foreground">Timeline Started</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">{startTimelineDate}</p>
              </div>
              {/* Point 2 */}
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <p className="font-semibold text-foreground">Plan Registered ({currentPlan})</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">Active Status validated</p>
              </div>
              {/* Point 3 */}
              {!isFreePlan && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-background animate-pulse" />
                  <p className="font-semibold text-foreground">Cycle Renews</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{nextRenewalDate}</p>
                </div>
              )}
            </div>

            {/* Invoice list */}
            <div className="pt-3 border-t border-border/30 mt-4 space-y-2">
              <span className="font-semibold text-foreground block mb-2">Invoice Logs</span>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-[10px] italic">No transaction records found.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="bg-muted/30 p-2.5 rounded-lg border border-border/20 flex justify-between items-center text-[11px] hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{inv.number}</p>
                          <p className="text-muted-foreground text-[9px]">
                            {inv.description} • {new Date(inv.created * 1000).toLocaleDateString(undefined, { dateStyle: "short" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">${inv.amount.toFixed(2)}</span>
                        {inv.pdf && inv.pdf !== "#" && (
                          <a 
                            href={inv.pdf} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans comparison list */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiers Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((p) => {
            const isCurrent = p.id === currentPlan;
            const upgradeText = isCurrent ? "Active Plan" : isFreePlan ? "Upgrade" : "Switch Plan";

            return (
              <Card key={p.id} className={`overflow-hidden border border-border/50 relative bg-card/30 backdrop-blur hover:border-border transition-all duration-200 ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                {isCurrent && (
                  <div className="bg-primary text-primary-foreground text-[9px] uppercase font-bold text-center py-1 absolute top-0 w-full tracking-wider">
                    Current Plan
                  </div>
                )}
                <CardContent className={`p-6 space-y-5 flex flex-col justify-between h-full ${isCurrent ? "pt-8" : ""}`}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-base text-foreground">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">For basic SaaS tasks.</p>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold gradient-text">{p.price}</span>
                      <span className="text-xs text-muted-foreground">{p.period}</span>
                    </div>

                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className={`w-full text-xs font-semibold h-9 ${isCurrent ? "bg-muted text-muted-foreground cursor-not-allowed border border-border/40" : "gradient-bg hover:opacity-90 cursor-pointer"}`}
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || !!actionLoading}
                    onClick={() => handlePlanAction(p.id)}
                  >
                    {actionLoading === p.id ? "Redirecting..." : upgradeText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!checkoutPlan} onOpenChange={(open) => { if (!open) setCheckoutPlan(null); }}>
        <DialogContent className="max-w-xl w-[95vw] rounded-xl border border-border/80 p-0 overflow-hidden bg-card/95 backdrop-blur-xl">
          {usage?.isStripeTestMode && (
            <div className="bg-amber-500/10 text-amber-500 border-b border-amber-500/20 text-center py-1.5 text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" /> Stripe Test Mode Sandbox Active
            </div>
          )}
          {checkoutPlan && (
            <div className="p-6 space-y-6">
              <DialogHeader className="text-center sm:text-left space-y-2">
                <DialogTitle className="text-xl font-bold flex items-center gap-2 justify-center sm:justify-start">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 animate-pulse" />
                  Upgrade to {checkoutPlan === "pro" ? "Pro Plan" : "Enterprise"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Collect payment to upgrade your subscription. Direct secure payment inline via Stripe Elements.
                </DialogDescription>
              </DialogHeader>

              <StripeElementsForm
                plan={checkoutPlan}
                price={checkoutPlan === "pro" ? "$12/mo" : "$49/mo"}
                onSuccess={async () => {
                  await loadBillingData();
                  setTimeout(() => {
                    setCheckoutPlan(null);
                  }, 2500);
                }}
                onClose={() => setCheckoutPlan(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="flex flex-col items-center gap-2">
      <RefreshCw className="h-7 w-7 text-primary animate-spin" />
      <span className="text-xs text-muted-foreground">Synchronizing billing dashboard...</span>
    </div>
  );
}
