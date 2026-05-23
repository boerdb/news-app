"use client";

import { useEffect, useState } from "react";
import type { NewsSource } from "@/lib/types";

const PREFS_KEY = "news-app:hiddenSources";

type Props = {
  sources: NewsSource[];
};

export function SourcePreferences({ sources }: Props) {
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) setHidden(JSON.parse(raw) as string[]);
      } catch {
        // ignore
      }
    });
  }, []);

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <p className="text-sm text-slate-500">
      Verberg bronnen in de feed (client-side, binnenkort serverfilter):{" "}
      {sources.map((s) => (
        <label key={s.id} className="mr-3 inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={!hidden.includes(s.id)}
            onChange={() => toggle(s.id)}
            className="rounded border-slate-300"
          />
          {s.name}
        </label>
      ))}
    </p>
  );
}
