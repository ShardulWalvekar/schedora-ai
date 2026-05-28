import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setSuccess(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-20 left-1/3 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 border border-border animate-fade-in">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 rounded-xl gradient-bg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">Schedora</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {success ? (
            <div className="space-y-6 text-center">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-primary">
                A password reset link has been sent to <strong>{email}</strong>. Please check your inbox and spam folders.
              </div>
              <Button onClick={() => navigate({ to: "/login" })} className="w-full gradient-bg hover:opacity-90 h-11">
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" className="w-full gradient-bg hover:opacity-90 h-11" disabled={loading}>
                {loading ? "Sending Link..." : "Send Reset Link"}
              </Button>
              <div className="text-center mt-4">
                <a href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
