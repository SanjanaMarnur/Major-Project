"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { toggle } = useTheme();

  return (
    <Button
      id="theme-toggle"
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-lg border border-border/60 bg-card/50 hover:bg-accent transition-colors"
      aria-label="Toggle theme"
      onClick={toggle}
      suppressHydrationWarning
    >
      {/* Use Tailwind classes based on the global .dark class to handle visibility.
          This avoids any React state usage for displaying and completely prevents hydration issues. */}
      <Sun className="h-4 w-4 text-amber-400 transition-all duration-200 hidden dark:block" />
      <Moon className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-all duration-200 block dark:hidden" />
    </Button>
  );
}
