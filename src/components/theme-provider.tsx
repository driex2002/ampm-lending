"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeScheme = "blue" | "emerald" | "violet" | "rose" | "amber" | "slate";
export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ThemeScheme;
  iconWeight: IconWeight;
  setMode: (m: ThemeMode) => void;
  setScheme: (s: ThemeScheme) => void;
  setIconWeight: (w: IconWeight) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  scheme: "blue",
  iconWeight: "duotone",
  setMode: () => {},
  setScheme: () => {},
  setIconWeight: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(mode: ThemeMode, scheme: ThemeScheme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-scheme", scheme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [scheme, setSchemeState] = useState<ThemeScheme>("blue");
  const [iconWeight, setIconWeightState] = useState<IconWeight>("duotone");

  useEffect(() => {
    const savedMode = (localStorage.getItem("theme-mode") as ThemeMode) || "system";
    const savedScheme = (localStorage.getItem("theme-scheme") as ThemeScheme) || "blue";
    const savedWeight = (localStorage.getItem("icon-weight") as IconWeight) || "duotone";
    setModeState(savedMode);
    setSchemeState(savedScheme);
    setIconWeightState(savedWeight);
    applyTheme(savedMode, savedScheme);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const currentMode = (localStorage.getItem("theme-mode") as ThemeMode) || "system";
      if (currentMode === "system") {
        applyTheme("system", (localStorage.getItem("theme-scheme") as ThemeScheme) || "blue");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("theme-mode", m);
    applyTheme(m, scheme);
  };

  const setScheme = (s: ThemeScheme) => {
    setSchemeState(s);
    localStorage.setItem("theme-scheme", s);
    applyTheme(mode, s);
  };

  const setIconWeight = (w: IconWeight) => {
    setIconWeightState(w);
    localStorage.setItem("icon-weight", w);
  };

  return (
    <ThemeContext.Provider value={{ mode, scheme, iconWeight, setMode, setScheme, setIconWeight }}>
      {children}
    </ThemeContext.Provider>
  );
}
