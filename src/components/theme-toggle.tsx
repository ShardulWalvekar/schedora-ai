import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Resolve current active state (handles 'system' fallback)
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-lg hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer overflow-hidden border border-border/40 transition-all duration-300 shadow-sm hover:shadow hover:border-primary/25"
      aria-label="Toggle theme"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun Icon (Rotates and shrinks to 0 scale in dark mode) */}
        <Sun className="h-[1.2rem] w-[1.2rem] text-primary rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 absolute" />
        
        {/* Moon Icon (Starts rotated and hidden, scales to 100 in dark mode) */}
        <Moon className="h-[1.2rem] w-[1.2rem] text-primary rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 absolute" />
      </div>
    </Button>
  );
}
