"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSeenArticleIds, markArticlesSeen } from "@/lib/seen-articles";

const POLL_MS = 5 * 60 * 1000;

type Props = {
  region?: string;
};

/** Polls for new headlines and refreshes the page silently (no popup). */
export function FeedAutoRefresh({ region }: Props) {
  const router = useRouter();
  const polling = useRef(false);

  useEffect(() => {
    const poll = async () => {
      if (polling.current || document.hidden) return;
      polling.current = true;
      try {
        const params = new URLSearchParams();
        if (region && region !== "all") params.set("region", region);
        const since = getSeenArticleIds();
        if (since?.length) params.set("since", JSON.stringify(since));

        const res = await fetch(`/api/feed?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          articles: { id: string }[];
          newCount?: number;
        };
        const newCount = data.newCount ?? 0;
        if (newCount > 0 && data.articles?.length) {
          markArticlesSeen(data.articles.map((a) => a.id));
          router.refresh();
        }
      } finally {
        polling.current = false;
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [region, router]);

  return null;
}
