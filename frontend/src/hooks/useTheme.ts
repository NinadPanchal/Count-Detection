"use client";
import { useState, useEffect } from "react";

export type ThemeMode = "default" | "nightvision" | "thermal";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>("default");

  useEffect(() => {
    const saved = localStorage.getItem("crowdsense-theme") as ThemeMode;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("crowdsense-theme", theme);
    document.body.classList.remove("night-vision", "thermal-vision");
    if (theme === "nightvision") document.body.classList.add("night-vision");
  }, [theme]);

  return { theme, setTheme };
}
