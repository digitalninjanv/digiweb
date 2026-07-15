"use client";
import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          padding: "12px 16px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
        },
        success: {
          iconTheme: {
            primary: "hsl(160 50% 55%)",
            secondary: "hsl(224 50% 5%)",
          },
        },
        error: {
          iconTheme: {
            primary: "hsl(0 63% 50%)",
            secondary: "hsl(224 50% 5%)",
          },
        },
      }}
    />
  );
}
