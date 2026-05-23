"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NewsSource } from "@/lib/types";
import { getPushSourceIds, setPushSourceIds } from "@/lib/push-sources";

const PUSH_ENABLED_KEY = "news-app:pushEnabled";

type Props = {
  sources: NewsSource[];
};

async function syncSourcesToServer(sourceIds: string[]): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const json = sub.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      sourceIds,
    }),
  });
}

export function PushSourcePreferences({ sources }: Props) {
  const allIds = useMemo(() => sources.map((s) => s.id), [sources]);
  const [selected, setSelected] = useState<string[]>(allIds);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setSelected(getPushSourceIds(allIds));
      setPushOn(localStorage.getItem(PUSH_ENABLED_KEY) === "1");
    });
  }, [allIds]);

  const persist = useCallback(
    async (next: string[]) => {
      setPushSourceIds(next);
      if (pushOn && next.length > 0) {
        await syncSourcesToServer(next);
      }
    },
    [pushOn],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      void persist(next);
      return next;
    });
  };

  const selectAll = () => {
    const next = [...allIds];
    setSelected(next);
    void persist(next);
  };

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
        Meldingen per bron
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Alleen geselecteerde bronnen sturen een pushmelding (ongeveer elke 15
        minuten bij nieuws).
      </p>
      {selected.length === 0 ? (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Selecteer minstens één bron om meldingen te ontvangen.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {sources.map((s) => (
          <label
            key={s.id}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() => toggle(s.id)}
              className="rounded border-slate-300"
            />
            {s.name}
          </label>
        ))}
      </div>
      {selected.length < allIds.length ? (
        <button
          type="button"
          onClick={selectAll}
          className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Alle bronnen selecteren
        </button>
      ) : null}
    </div>
  );
}
