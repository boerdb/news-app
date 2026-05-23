import { fetchNewsApiHeadlines, isNewsApiEnabled } from "./newsapi";
import {
  computeFingerprint,
  fetchRssFeed,
} from "./rss-aggregator";
import type { Article, FeedResult, Region } from "./types";

function mergeArticles(rss: Article[], api: Article[]): Article[] {
  const seen = new Set<string>();
  const merged: Article[] = [];

  for (const article of [...rss, ...api]) {
    const key = article.link || article.id;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(article);
  }

  return merged
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 100);
}

export async function getAggregatedFeed(options?: {
  region?: Region | "all";
  sourceId?: string;
}): Promise<FeedResult> {
  const rss = await fetchRssFeed(options);
  let apiArticles: Article[] = [];

  if (isNewsApiEnabled() && !options?.sourceId) {
    apiArticles = await fetchNewsApiHeadlines(options?.region ?? "all");
  }

  const articles = mergeArticles(rss.articles, apiArticles);

  return {
    articles,
    fetchedAt: new Date().toISOString(),
    sources: rss.sources,
  };
}

export { computeFingerprint };
