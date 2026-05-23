"use client";

import { Download, Share2, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";

export function InstallBanner() {
  const { showAndroid, showIos, install, dismiss } = usePwaInstall();

  if (!showAndroid && !showIos) return null;

  return (
    <div
      role="region"
      aria-label="App installeren"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-lg gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Headlines installeren</p>
          {showIos ? (
            <p className="mt-0.5 text-xs text-slate-300">
              Tik op <Share2 className="mx-0.5 inline h-3 w-3" /> en kies{" "}
              <strong>Zet op beginscherm</strong> voor pushmeldingen.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-300">
              Installeer voor snellere toegang en meldingen bij nieuw nieuws.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {showAndroid ? (
            <Button size="sm" onClick={install}>
              Installeren
            </Button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
