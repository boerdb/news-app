"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isPushConfigured } from "@/lib/push-client";
import {
  getPushBlockReason,
  hasPushApis,
  isStandalonePwa,
  pushBlockMessage,
} from "@/lib/pwa-capabilities";
import { getPushSourceIds } from "@/lib/push-sources";
import { NEWS_SOURCES } from "@/lib/sources";

const PUSH_ENABLED_KEY = "news-app:pushEnabled";
const ALL_SOURCE_IDS = NEWS_SOURCES.map((s) => s.id);

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  });
}

type Props = {
  /** Vanaf server (build-time env), voorkomt verkeerde SSR-tekst. */
  configuredOnServer?: boolean;
};

export function PushOptIn({ configuredOnServer = false }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(configuredOnServer);
  const [hint, setHint] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const hydrate = () => {
      setConfigured(isPushConfigured());
      setEnabled(localStorage.getItem(PUSH_ENABLED_KEY) === "1");
      setStandalone(isStandalonePwa());
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
      const block = getPushBlockReason(isPushConfigured());
      setHint(pushBlockMessage(block));
      if (hasPushApis() && isPushConfigured()) {
        registerServiceWorker();
      }
    };
    queueMicrotask(hydrate);
  }, []);

  const finishSubscribe = (reg: ServiceWorkerRegistration) => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return Promise.reject(new Error("Geen VAPID-sleutel"));

    const sourceIds = getPushSourceIds(ALL_SOURCE_IDS);
    if (sourceIds.length === 0) {
      setHint("Selecteer minstens één bron voor meldingen.");
      return Promise.resolve();
    }

    return reg.pushManager
      .getSubscription()
      .then((existing) =>
        existing ??
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }),
      )
      .then((sub) => {
        const json = sub.toJSON();
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            sourceIds,
          }),
        });
      })
      .then(() => {
        localStorage.setItem(PUSH_ENABLED_KEY, "1");
        setEnabled(true);
        setHint(null);
      });
  };

  /** iOS: requestPermission moet direct vanuit de tik komen (geen async vóór de aanvraag). */
  const handleEnable = () => {
    const block = getPushBlockReason(configured);
    const blockMsg = pushBlockMessage(block);
    if (block && block !== "denied") {
      setHint(blockMsg);
      return;
    }

    if (!hasPushApis()) {
      setHint(pushBlockMessage("no-api"));
      return;
    }

    setLoading(true);
    setHint(null);

    Notification.requestPermission()
      .then((perm) => {
        setPermission(perm);
        if (perm !== "granted") {
          setHint(
            perm === "denied"
              ? pushBlockMessage("denied")
              : "Meldingen niet toegestaan. Probeer opnieuw via de knop Inschakelen.",
          );
          return;
        }
        return navigator.serviceWorker.ready.then(finishSubscribe);
      })
      .catch(() => {
        setHint("Kon meldingen niet inschakelen. Probeer opnieuw vanaf het beginscherm-icoon.");
      })
      .finally(() => setLoading(false));
  };

  const handleDisable = () => {
    setLoading(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return;
        return fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).then(() => sub.unsubscribe());
      })
      .then(() => {
        localStorage.removeItem(PUSH_ENABLED_KEY);
        setEnabled(false);
      })
      .finally(() => setLoading(false));
  };

  if (!configured) {
    return (
      <p className="text-sm text-slate-500">
        Pushmeldingen vereisen VAPID-sleutels in de omgeving. Zie README.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-50">
            Meldingen bij nieuw nieuws
          </p>
          <p className="text-sm text-slate-500">
            Status: {permission === "granted" && enabled ? "aan" : "uit"}
            {standalone ? " · app-modus" : " · in browser"}
          </p>
        </div>
        {enabled ? (
          <Button variant="outline" onClick={handleDisable} disabled={loading}>
            <BellOff className="h-4 w-4" />
            Uitschakelen
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleEnable}
            disabled={loading || permission === "denied"}
          >
            <Bell className="h-4 w-4" />
            Inschakelen
          </Button>
        )}
      </div>
      {hint ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
