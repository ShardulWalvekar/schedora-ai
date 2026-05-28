import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ShieldAlert, Sparkles, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { StripeElementsForm } from "@/components/stripe-elements-form";

interface UsageDetails {
  plan: string;
  eventTypesUsed: number;
  eventTypesLimit: number;
  bookingsUsed: number;
  bookingsLimit: number;
  isStripeTestMode: boolean;
}

interface PlanEnforcerContextType {
  usage: UsageDetails | null;
  loading: boolean;
  refreshUsage: () => Promise<void>;
  checkPlanAccess: (type: "event_type" | "booking" | "team") => boolean;
  openUpgradeModal: () => void;
}

const PlanEnforcerContext = createContext<PlanEnforcerContextType | null>(null);

export function PlanEnforcerProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [usage, setUsage] = useState<UsageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "enterprise" | null>(null);

  useEffect(() => {
    if (session?.access_token) {
      refreshUsage();
    } else {
      setLoading(false);
    }
  }, [session]);

  async function refreshUsage() {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/billing/usage", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error("Failed to load usage details", err);
    } finally {
      setLoading(false);
    }
  }

  function checkPlanAccess(type: "event_type" | "booking" | "team"): boolean {
    if (!usage) return true; // If usage hasn't loaded, let it pass and fail backend-side
    
    if (type === "event_type") {
      if (usage.eventTypesUsed >= usage.eventTypesLimit) {
        setModalOpen(true);
        return false;
      }
    } else if (type === "booking") {
      if (usage.bookingsUsed >= usage.bookingsLimit) {
        setModalOpen(true);
        return false;
      }
    } else if (type === "team") {
      if (usage.plan === "free") {
        setModalOpen(true);
        return false;
      }
    }
    return true;
  }

  function openUpgradeModal() {
    setModalOpen(true);
  }

  function handleUpgrade(plan: "pro" | "enterprise") {
    setCheckoutPlan(plan);
  }

  return (
    <PlanEnforcerContext.Provider
      value={{
        usage,
        loading,
        refreshUsage,
        checkPlanAccess,
        openUpgradeModal,
      }}
    >
      {children}

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setCheckoutPlan(null); }}>
        <DialogContent className="max-w-xl w-[95vw] rounded-xl border border-border/80 p-0 overflow-hidden bg-card/95 backdrop-blur-xl">
          {/* Test mode banner */}
          {usage?.isStripeTestMode && (
            <div className="bg-amber-500/10 text-amber-500 border-b border-amber-500/20 text-center py-1.5 text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" /> Stripe Test Mode Sandbox Active
            </div>
          )}

          {checkoutPlan ? (
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
                  await refreshUsage();
                  setTimeout(() => {
                    setModalOpen(false);
                    setCheckoutPlan(null);
                  }, 2500);
                }}
                onClose={() => setCheckoutPlan(null)}
              />
            </div>
          ) : (
            <>
              <div className="p-6 space-y-6">
                <DialogHeader className="text-center sm:text-left space-y-2">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2 justify-center sm:justify-start">
                    <ShieldAlert className="h-6 w-6 text-primary shrink-0 animate-bounce" />
                    Upgrade Your Plan
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    You've reached the maximum allocation for your current **{usage?.plan || "Free"}** tier. Upgrade below for unlimited access.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pro plan upgrade card */}
                  <Card className="border border-border/50 bg-card/60 relative overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-base">Pro Plan</span>
                          <Badge variant="secondary" className="text-[9px] py-0 px-2">Popular</Badge>
                        </div>
                        <div>
                          <span className="text-2xl font-extrabold">$12</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Unlimited Events</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 500 bookings/mo</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Teams features</li>
                        </ul>
                      </div>
                      <Button 
                        className="w-full gradient-bg hover:opacity-90 text-xs font-semibold cursor-pointer h-9 mt-2" 
                        onClick={() => handleUpgrade("pro")}
                      >
                        Upgrade to Pro
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Enterprise plan upgrade card */}
                  <Card className="border border-border/50 bg-card/60 relative overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-base">Enterprise</span>
                        </div>
                        <div>
                          <span className="text-2xl font-extrabold">$49</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Everything in Pro</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Unlimited bookings</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Dedicated support</li>
                        </ul>
                      </div>
                      <Button 
                        className="w-full gradient-bg hover:opacity-90 text-xs font-semibold cursor-pointer h-9 mt-2" 
                        onClick={() => handleUpgrade("enterprise")}
                      >
                        Upgrade Enterprise
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Test card prompt */}
                {usage?.isStripeTestMode && (
                  <div className="bg-muted/40 p-3 rounded-lg text-[10px] text-muted-foreground flex gap-2 border border-border/30">
                    <CreditCard className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">Sandbox Mode Active</span>: Use fake card <span className="font-semibold text-foreground">4242 4242 4242 4242</span> with any future expiry and cvc.
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="bg-muted/15 p-4 border-t border-border/30 flex justify-end gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 text-xs" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PlanEnforcerContext.Provider>
  );
}

export function usePlanEnforcer() {
  const context = useContext(PlanEnforcerContext);
  if (!context) {
    throw new Error("usePlanEnforcer must be used within a PlanEnforcerProvider");
  }
  return context;
}
