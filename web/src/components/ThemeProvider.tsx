"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with "dark" – matches the class we pre-set in <html> via the inline
  // script in layout.tsx, so the first render is always consistent.
  const [theme, setThemeState] = useState<Theme>("dark");

  // On mount, sync with whatever the inline script already applied.
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "dark";
    setThemeState(saved);
    // The inline script already applied the class, but make sure it's right.
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
