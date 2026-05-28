import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});

const lineData = [
  { day: "Mon", bookings: 4 }, { day: "Tue", bookings: 7 }, { day: "Wed", bookings: 5 },
  { day: "Thu", bookings: 9 }, { day: "Fri", bookings: 6 }, { day: "Sat", bookings: 2 }, { day: "Sun", bookings: 1 },
];

const barData = [
  { name: "30 Min", count: 24 }, { name: "60 Min", count: 18 },
  { name: "15 Min", count: 12 }, { name: "45 Min", count: 8 },
];

const pieData = [
  { name: "Confirmed", value: 45, color: "#6d5ce7" },
  { name: "Completed", value: 30, color: "#10b981" },
  { name: "Cancelled", value: 8, color: "#ef4444" },
];

const stats = [
  { icon: Calendar, label: "Total Bookings", value: "83", change: "+12%", color: "text-blue-500 dark:text-blue-400" },
  { icon: TrendingUp, label: "Avg Per Day", value: "4.8", change: "+8%", color: "text-emerald-500 dark:text-emerald-400" },
  { icon: Target, label: "Completion Rate", value: "85%", change: "+3%", color: "text-violet-500 dark:text-violet-400" },
];

function AnalyticsPage() {
  const { theme } = useTheme();

  // Resolve current active state (handles 'system' fallback)
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const gridColor = isDark ? "#27272a" : "#e2e8f0";
  const textColor = isDark ? "#71717a" : "#64748b";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipBorder = isDark ? "#27272a" : "#e2e8f0";
  const tooltipTextColor = isDark ? "#fafafa" : "#0f172a";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your scheduling performance and trends.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10"><s.icon className={`h-6 w-6 ${s.color}`} /></div>
                <div>
                  <p className="text-3xl font-bold gradient-text">{s.value}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <span className="text-xs text-emerald-500">{s.change}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Bookings This Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" stroke={textColor} fontSize={12} />
                <YAxis stroke={textColor} fontSize={12} />
                <RechartsTooltip
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "8px",
                    color: tooltipTextColor,
                  }}
                  itemStyle={{ color: tooltipTextColor }}
                  labelStyle={{ color: tooltipTextColor }}
                />
                <Line type="monotone" dataKey="bookings" stroke="#6d5ce7" strokeWidth={2} dot={{ fill: "#6d5ce7" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Event Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} />
                <YAxis stroke={textColor} fontSize={12} />
                <RechartsTooltip
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "8px",
                    color: tooltipTextColor,
                  }}
                  itemStyle={{ color: tooltipTextColor }}
                  labelStyle={{ color: tooltipTextColor }}
                />
                <Bar dataKey="count" fill="#6d5ce7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Booking Status</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: textColor }}
              >
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  color: tooltipTextColor,
                }}
                itemStyle={{ color: tooltipTextColor }}
                labelStyle={{ color: tooltipTextColor }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
