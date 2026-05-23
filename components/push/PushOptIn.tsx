"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isPushConfigured } from "@/lib/push-client";

const PUSH_ENABLED_KEY = "news-app:pushEnabled";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushOptIn() {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const hydrate = () => {
      setConfigured(isPushConfigured());
      setEnabled(localStorage.getItem(PUSH_ENABLED_KEY) === "1");
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    };
    queueMicrotask(hydrate);
  }, []);

  const subscribe = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !("serviceWorker" in navigator)) return;

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            publicKey,
          ) as BufferSource,
        });
      }

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      localStorage.setItem(PUSH_ENABLED_KEY, "1");
      setEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      localStorage.removeItem(PUSH_ENABLED_KEY);
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!configured) {
    return (
      <p className="text-sm text-slate-500">
        Pushmeldingen vereisen VAPID-sleutels in de omgeving. Zie README.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-50">
          Meldingen bij nieuw nieuws
        </p>
        <p className="text-sm text-slate-500">
          Status: {permission === "granted" && enabled ? "aan" : "uit"}
          {permission === "denied" ? " (geblokkeerd in browser)" : ""}
        </p>
      </div>
      {enabled ? (
        <Button variant="outline" onClick={unsubscribe} disabled={loading}>
          <BellOff className="h-4 w-4" />
          Uitschakelen
        </Button>
      ) : (
        <Button onClick={subscribe} disabled={loading || permission === "denied"}>
          <Bell className="h-4 w-4" />
          Inschakelen
        </Button>
      )}
    </div>
  );
}
