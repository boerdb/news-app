"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const UPDATE_SNOOZE_KEY = "news-app:updateSnooze";
const SNOOZE_MS = 4 * 60 * 60 * 1000;

export function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const snooze = Number(localStorage.getItem(UPDATE_SNOOZE_KEY) ?? "0");
    if (Date.now() - snooze < SNOOZE_MS) return;

    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      setReg(r);

      const checkWaiting = () => {
        if (r.waiting) setShow(true);
      };

      checkWaiting();
      r.addEventListener("updatefound", () => {
        const newWorker = r.installing;
        newWorker?.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setShow(true);
          }
        });
      });
    });
  }, []);

  const snooze = () => {
    localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now()));
    setShow(false);
  };

  const applyUpdate = () => {
    reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    setShow(false);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    setTimeout(() => window.location.reload(), 1500);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex justify-center px-4">
      <div className="flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
          <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Update beschikbaar</p>
          <p className="text-xs text-slate-500">Herlaad voor de nieuwste versie</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={snooze}>
            Later
          </Button>
          <Button size="sm" onClick={applyUpdate}>
            Bijwerken
          </Button>
        </div>
      </div>
    </div>
  );
}
