import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarPlus, CalendarCheck, Calendar,
  Clock, Users, CreditCard, BarChart3, Settings,
  LogOut, Menu, X,
} from "lucide-react";
import { PlanEnforcerProvider } from "@/components/plan-enforcer";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/dashboard/event-types", icon: CalendarPlus, label: "Event Types" },
  { to: "/dashboard/bookings", icon: CalendarCheck, label: "Bookings" },
  { to: "/dashboard/calendars", icon: Calendar, label: "Calendars" },
  { to: "/dashboard/availability", icon: Clock, label: "Availability" },
  { to: "/dashboard/team", icon: Users, label: "Team" },
  { to: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
] as const;

function DashboardLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const sidebar = (
    <aside className={cn(
      "fixed top-0 left-0 z-40 h-screen w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300",
      isMobile && !sidebarOpen && "-translate-x-full",
      isMobile && sidebarOpen && "translate-x-0"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg gradient-bg">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">Schedora</span>
        </Link>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: !!(item as any).exact }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:border-l-2 [&.active]:border-primary"
            onClick={() => isMobile && setSidebarOpen(false)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{(profile?.full_name || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <PlanEnforcerProvider>
      <div className="min-h-screen bg-background">
        {sidebar}

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <div className={cn("transition-all duration-300 flex flex-col min-h-screen", !isMobile && "ml-64")}>
          {/* Unified sticky top header */}
          <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 bg-background/65 backdrop-blur border-b border-border/40 select-none">
            <div className="flex items-center gap-3">
              {isMobile ? (
                <>
                  <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-muted transition-colors">
                    <Menu className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-semibold gradient-text">Schedora</span>
                </>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Portal Dashboard</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </PlanEnforcerProvider>
  );
}
