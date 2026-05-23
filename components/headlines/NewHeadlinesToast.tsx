"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const POLL_MS = 5 * 60 * 1000;
const SEEN_KEY = "news-app:lastSeenIds";

type Props = {
  region?: string;
};

export function NewHeadlinesToast({ region }: Props) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const polling = useRef(false);

  useEffect(() => {
    const poll = async () => {
      if (polling.current || document.hidden) return;
      polling.current = true;
      try {
        const params = new URLSearchParams();
        if (region && region !== "all") params.set("region", region);
        const since = localStorage.getItem(SEEN_KEY);
        if (since) params.set("since", since);

        const res = await fetch(`/api/feed?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          articles: { id: string }[];
          newCount?: number;
        };
        const newCount = data.newCount ?? 0;
        if (newCount > 0) setCount(newCount);
      } finally {
        polling.current = false;
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [region]);

  const refresh = () => {
    const ids = localStorage.getItem(SEEN_KEY);
    if (ids) localStorage.setItem(SEEN_KEY, ids);
    setCount(0);
    router.refresh();
  };

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 flex justify-center px-4">
      <div className="flex max-w-md items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-lg dark:border-blue-900 dark:bg-slate-900">
        <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
          {count === 1
            ? "1 nieuwe headline"
            : `${count} nieuwe headlines`}
        </p>
        <Button size="sm" onClick={refresh}>
          Bekijken
        </Button>
      </div>
    </div>
  );
}

export function markArticlesSeen(ids: string[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(0, 50)));
}
