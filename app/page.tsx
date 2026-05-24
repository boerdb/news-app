import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageMain } from "@/components/layout/PageMain";
import { FeedList } from "@/components/headlines/FeedList";
import { RegionTabs } from "@/components/headlines/RegionTabs";
import { FeedAutoRefresh } from "@/components/headlines/FeedAutoRefresh";
import { SeenArticlesMarker } from "@/components/headlines/SeenArticlesMarker";
import { getAggregatedFeed } from "@/lib/feed";
import type { Region } from "@/lib/types";

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<{ region?: string }>;
};

function parseRegion(value?: string): Region | "all" {
  if (value === "nl" || value === "en" || value === "de" || value === "us") {
    return value;
  }
  return "all";
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const region = parseRegion(params.region);
  const feed = await getAggregatedFeed({ region });
  const articleIds = feed.articles.map((a) => a.id);

  return (
    <>
      <AppHeader />
      <PageMain>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Headlines
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Laatst bijgewerkt:{" "}
            {new Date(feed.fetchedAt).toLocaleString("nl-NL", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Amsterdam",
            })}
          </p>
        </div>

        <Suspense fallback={<div className="h-10" />}>
          <RegionTabs />
        </Suspense>

        <div className="mt-6">
          <FeedList articles={feed.articles} sources={feed.sources} />
        </div>
      </PageMain>

      <Suspense fallback={null}>
        <FeedAutoRefresh region={region} />
      </Suspense>
      <SeenArticlesMarker articleIds={articleIds} />
    </>
  );
}
