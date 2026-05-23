"use client";

import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Suspense fallback={null}>
        <UpdateBanner />
      </Suspense>
      <InstallBanner />
    </ThemeProvider>
  );
}
