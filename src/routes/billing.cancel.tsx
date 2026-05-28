import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/billing/cancel")({
  component: BillingCancelPage,
});

function BillingCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />

      <Card className="max-w-md w-full border border-border/60 shadow-lg relative overflow-hidden bg-card/65 backdrop-blur-xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold tracking-tight">Checkout Cancelled</h1>
            <p className="text-sm text-muted-foreground px-2">
              Your subscription upgrade process was cancelled. No transactions or charges were processed on your account.
            </p>
          </div>

          <Button 
            className="w-full font-semibold cursor-pointer h-11 flex items-center justify-center gap-1.5" 
            variant="outline"
            onClick={() => navigate({ to: "/dashboard/billing" })}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Billing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
