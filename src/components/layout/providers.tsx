"use client";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useThemeStore } from "@/stores/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = (localStorage.getItem("theme") || "dark") as "light" | "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
    useThemeStore.getState().setTheme(theme);
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
