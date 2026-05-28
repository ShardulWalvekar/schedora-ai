import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Lock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

// Lazy load Stripe.js
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface StripeElementsFormProps {
  plan: "pro" | "enterprise";
  price: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function StripeElementsForm({ plan, price, onSuccess, onClose }: StripeElementsFormProps) {
  const { session } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initializeCheckout() {
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/billing/create-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan }),
        });

        if (res.ok) {
          const data = await res.json();
          setClientSecret(data.clientSecret);
          setIsMock(!!data.isMock);
        } else {
          const errData = await res.json();
          toast.error(errData.error || "Failed to initialize payment gateway");
        }
      } catch (err) {
        console.error("Payment init error:", err);
        toast.error("Billing server offline.");
      } finally {
        setLoading(false);
      }
    }

    initializeCheckout();
  }, [plan, session]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Contacting billing gateway...</p>
      </div>
    );
  }

  // If Stripe key exists and server is not in mock mode, use real Stripe Elements
  if (stripePromise && clientSecret && !isMock) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "night",
            variables: {
              colorPrimary: "#6d5ce7",
              colorBackground: "#121214",
              colorText: "#ffffff",
              colorDanger: "#df1b41",
              fontFamily: "Inter, sans-serif",
            },
          },
        }}
      >
        <RealStripeForm
          plan={plan}
          price={price}
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      </Elements>
    );
  }

  // Fallback to Sandbox Mock Elements Form
  return (
    <MockStripeForm
      plan={plan}
      price={price}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  );
}

// ============================================================================
// REAL STRIPE ELEMENTS CHECKOUT FORM
// ============================================================================
interface RealStripeFormProps {
  plan: "pro" | "enterprise";
  price: string;
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
}

function RealStripeForm({ plan, price, clientSecret, onSuccess, onClose }: RealStripeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState<boolean>(false);
  const [postalCode, setPostalCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMessage(null);

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      setProcessing(false);
      return;
    }

    try {
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            address: {
              postal_code: postalCode,
            },
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        toast.error(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setSuccess(true);
        toast.success("Payment succeeded! Subscription active.");
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setErrorMessage("Payment verification pending.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  const stripeElementOptions = {
    style: {
      base: {
        color: "#ffffff",
        fontFamily: "Inter, sans-serif",
        fontSmoothing: "antialiased",
        fontSize: "14px",
        "::placeholder": {
          color: "#a1a1aa",
        },
      },
      invalid: {
        color: "#ef4444",
        iconColor: "#ef4444",
      },
    },
  };

  if (success) {
    return <SuccessAnimation plan={plan} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-1">
      <div className="space-y-4">
        {/* Test Mode Badge */}
        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold">Stripe Live Gateway Initialized</span>
              <p className="text-muted-foreground mt-0.5">Your payment details are encrypted and securely sent directly to Stripe.</p>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Card Number</Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <CardNumberElement className="w-full self-center" options={stripeElementOptions} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Expiration Date</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardExpiryElement className="w-full self-center" options={stripeElementOptions} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">CVC</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <CardCvcElement className="w-full self-center" options={stripeElementOptions} />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zip" className="text-xs font-semibold text-muted-foreground">ZIP / Postal Code</Label>
          <Input
            id="zip"
            type="text"
            required
            placeholder="90210"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="h-10 bg-muted/20 border-input text-sm"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/15 text-destructive border border-destructive/25 rounded-xl p-3 flex gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-between items-center gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-1/3 text-xs h-9 cursor-pointer"
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-2/3 gradient-bg hover:opacity-90 text-xs font-semibold h-9 flex items-center justify-center gap-1.5 cursor-pointer"
          disabled={!stripe || processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" />
              Pay {price}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// SANDBOX MOCK STRIPE CHECKOUT FORM (LOCAL DEV SANDBOX FALLBACK)
// ============================================================================
interface MockStripeFormProps {
  plan: "pro" | "enterprise";
  price: string;
  onSuccess: () => void;
  onClose: () => void;
}

function MockStripeForm({ plan, price, onSuccess, onClose }: MockStripeFormProps) {
  const { session } = useAuth();
  const [cardNumber, setCardNumber] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [cvc, setCvc] = useState<string>("");
  const [zip, setZip] = useState<string>("");

  const [processing, setProcessing] = useState<boolean>(false);
  const [show3DS, setShow3DS] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Format Card Number (adds spaces)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.substring(0, 16);
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  // Format Expiry (adds slash MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length > 2) {
      setExpiry(value.substring(0, 2) + "/" + value.substring(2));
    } else {
      setExpiry(value);
    }
  };

  // Auto-fill Test Card Scenario
  const fillTestCard = (num: string) => {
    setCardNumber(num);
    setExpiry("12/30");
    setCvc("123");
    setZip("10001");
    setErrorAlert(null);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setProcessing(true);
    setErrorAlert(null);

    const rawCard = cardNumber.replace(/\s/g, "");

    // 1. Simulate Network Latency
    setTimeout(async () => {
      // 2. Validate Card Scenarios
      if (rawCard === "4000000000000002") {
        // Declined
        setErrorAlert("Your card was declined. Please try another card.");
        setProcessing(false);
      } else if (rawCard === "4000002500003155") {
        // 3D Secure Authentication Required
        setProcessing(false);
        setShow3DS(true);
      } else if (rawCard === "4000000000009995") {
        // Insufficient Funds
        setErrorAlert("Your card has insufficient funds to complete this subscription.");
        setProcessing(false);
      } else if (rawCard === "4000000000000341") {
        // Expired/Failed card
        setErrorAlert("Card transaction failed: The card has expired or incorrect validation data was provided.");
        setProcessing(false);
      } else {
        // Success payment (Includes default 4242 4242 4242 4242)
        await completeMockUpgrade();
      }
    }, 1500);
  };

  const completeMockUpgrade = async () => {
    try {
      const mockUpdateRes = await fetch("/api/billing/mock-success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (mockUpdateRes.ok) {
        setSuccess(true);
        toast.success(`Subscription upgraded to ${plan}!`);
        setTimeout(() => {
          onSuccess();
        }, 2200);
      } else {
        setErrorAlert("Failed to register subscription on Schedora server.");
      }
    } catch (err) {
      setErrorAlert("Database update error. Please try again.");
    } finally {
      setProcessing(false);
      setShow3DS(false);
    }
  };

  if (success) {
    return <SuccessAnimation plan={plan} />;
  }

  if (show3DS) {
    return (
      <div className="p-4 space-y-6 text-center border border-border/50 rounded-xl bg-card/75 backdrop-blur animate-fade-in">
        <div className="space-y-2">
          <Badge variant="warning" className="animate-pulse">3D SECURE AUTH REQUIRED</Badge>
          <h3 className="font-bold text-base">Authentication Required</h3>
          <p className="text-xs text-muted-foreground px-4">
            Stripe sandbox simulates a 3D-Secure window. Verify this payment by clicking the button below.
          </p>
        </div>

        <div className="bg-muted/40 p-4 border border-border/30 rounded-xl text-xs space-y-1.5 text-left max-w-sm mx-auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Merchant:</span>
            <span className="font-semibold">Schedora Inc.</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold text-primary">{price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Card:</span>
            <span className="font-semibold font-mono">•••• •••• •••• 3155</span>
          </div>
        </div>

        <div className="flex gap-4 max-w-sm mx-auto">
          <Button
            variant="outline"
            className="w-1/2 text-xs h-9 cursor-pointer"
            onClick={() => {
              setShow3DS(false);
              setProcessing(false);
            }}
          >
            Fail Auth
          </Button>
          <Button
            className="w-1/2 gradient-bg hover:opacity-90 text-xs font-semibold h-9 cursor-pointer"
            onClick={async () => {
              setProcessing(true);
              await completeMockUpgrade();
            }}
            disabled={processing}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verify Identity"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePay} className="space-y-5 p-1">
      {/* Sandbox Active Header */}
      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-xl p-3 flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Sandbox Test Mode Active
        </div>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Use the cards below to test different payment responses. Under the hood, this simulates direct client-to-stripe Elements calls.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => fillTestCard("4242424242424242")}
            className="bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => fillTestCard("4000000000000002")}
            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => fillTestCard("4000002500003155")}
            className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Auth Req
          </button>
          <button
            type="button"
            onClick={() => fillTestCard("4000000000009995")}
            className="bg-pink-500/10 hover:bg-pink-500/25 border border-pink-500/20 text-pink-400 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Low Funds
          </button>
          <button
            type="button"
            onClick={() => fillTestCard("4000000000000341")}
            className="bg-orange-500/10 hover:bg-orange-500/25 border border-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Fail
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Card Number */}
        <div className="space-y-1.5">
          <Label htmlFor="mockCardNumber" className="text-xs font-semibold text-muted-foreground flex justify-between">
            <span>Card Number</span>
            <span className="font-mono text-[10px]">Mock Elements Input</span>
          </Label>
          <div className="relative">
            <Input
              id="mockCardNumber"
              type="text"
              required
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className="h-10 pl-9 font-mono bg-muted/20 border-input text-sm tracking-widest"
            />
            <CreditCard className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          </div>
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="mockExpiry" className="text-xs font-semibold text-muted-foreground">Expiry Date</Label>
            <Input
              id="mockExpiry"
              type="text"
              required
              placeholder="MM/YY"
              value={expiry}
              onChange={handleExpiryChange}
              className="h-10 bg-muted/20 border-input text-sm text-center font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mockCvc" className="text-xs font-semibold text-muted-foreground">CVC</Label>
            <Input
              id="mockCvc"
              type="password"
              required
              placeholder="123"
              value={cvc}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setCvc(val.length > 4 ? val.substring(0, 4) : val);
              }}
              className="h-10 bg-muted/20 border-input text-sm text-center font-mono"
            />
          </div>
        </div>

        {/* ZIP */}
        <div className="space-y-1.5">
          <Label htmlFor="mockZip" className="text-xs font-semibold text-muted-foreground">ZIP / Postal Code</Label>
          <Input
            id="mockZip"
            type="text"
            required
            placeholder="10001"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\s/g, ""))}
            className="h-10 bg-muted/20 border-input text-sm"
          />
        </div>
      </div>

      {errorAlert && (
        <div className="bg-destructive/15 text-destructive border border-destructive/25 rounded-xl p-3 flex gap-2 text-xs animate-shake">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 animate-bounce" />
          <span>{errorAlert}</span>
        </div>
      )}

      {/* Button footer */}
      <div className="flex justify-between items-center gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-1/3 text-xs h-9 cursor-pointer"
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-2/3 gradient-bg hover:opacity-90 text-xs font-semibold h-9 flex items-center justify-center gap-1.5 cursor-pointer"
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing payment...
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" />
              Pay {price}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// PREMIUM SUCCESS LOTTIE-LIKE CHECK ANIMATION
// ============================================================================
function SuccessAnimation({ plan }: { plan: string }) {
  return (
    <div className="py-6 text-center space-y-4 animate-fade-in">
      <div className="relative inline-flex items-center justify-center">
        {/* Glow behind check */}
        <div className="absolute w-20 h-20 bg-emerald-500/20 rounded-full blur-xl animate-ping" />
        <CheckCircle2 className="h-16 w-16 text-emerald-500 shrink-0 relative z-10" />
      </div>
      <div className="space-y-1">
        <h3 className="font-extrabold text-lg text-foreground">Payment Successful!</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Your Schedora <span className="font-semibold text-foreground capitalize">{plan}</span> subscription has been activated successfully.
        </p>
      </div>
    </div>
  );
}
