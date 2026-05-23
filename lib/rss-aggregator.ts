import Parser from "rss-parser";
import { getSourcesByRegion } from "./sources";
import type { NewsSource } from "./types";
import type { Article, FeedResult, Region, SourceStatus } from "./types";

const parser = new Parser({
  timeout: 12_000,
  headers: {
    "User-Agent": "NewsHeadlinesPWA/1.0 (+https://github.com/news-app)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

const PER_SOURCE_LIMIT = 15;
const TOTAL_LIMIT = 100;
const FETCH_TIMEOUT_MS = 14_000;

function articleId(sourceId: string, link: string): string {
  return `${sourceId}:${link}`;
}

function pickImage(item: Parser.Item): string | undefined {
  const enclosure = item.enclosure;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return enclosure.url;
  }
  const media = item as Parser.Item & {
    "media:content"?: { $?: { url?: string } };
    "media:thumbnail"?: { $?: { url?: string } };
  };
  return media["media:content"]?.$?.url ?? media["media:thumbnail"]?.$?.url;
}

async function fetchSourceFeed(
  source: NewsSource,
): Promise<{ articles: Article[]; status: SourceStatus }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const feed = await parser.parseURL(source.feedUrl);
    clearTimeout(timer);

    const articles: Article[] = (feed.items ?? [])
      .slice(0, PER_SOURCE_LIMIT)
      .map((item) => {
        const link = item.link ?? item.guid ?? "";
        const pubDate = item.isoDate ?? item.pubDate ?? new Date().toISOString();
        return {
          id: articleId(source.id, link),
          title: (item.title ?? "Zonder titel").trim(),
          link,
          publishedAt: new Date(pubDate).toISOString(),
          sourceId: source.id,
          sourceName: source.name,
          region: source.region,
          imageUrl: pickImage(item),
          summary: item.contentSnippet?.slice(0, 200),
        };
      })
      .filter((a) => a.link.length > 0);

    return {
      articles,
      status: {
        sourceId: source.id,
        sourceName: source.name,
        ok: true,
        count: articles.length,
      },
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return {
      articles: [],
      status: {
        sourceId: source.id,
        sourceName: source.name,
        ok: false,
        error: message,
        count: 0,
      },
    };
  }
}

function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const result: Article[] = [];
  for (const article of articles) {
    const key = article.link || `${article.sourceId}:${article.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

export async function fetchRssFeed(options?: {
  region?: Region | "all";
  sourceId?: string;
}): Promise<FeedResult> {
  let sources = getSourcesByRegion(options?.region ?? "all");
  if (options?.sourceId) {
    sources = sources.filter((s) => s.id === options.sourceId);
  }

  const results = await Promise.all(sources.map(fetchSourceFeed));
  const sources_status = results.map((r) => r.status);
  const articles = dedupeArticles(
    results
      .flatMap((r) => r.articles)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, TOTAL_LIMIT),
  );

  return {
    articles,
    fetchedAt: new Date().toISOString(),
    sources: sources_status,
  };
}

export function computeFingerprint(articles: Article[]): string {
  const ids = articles
    .slice(0, 30)
    .map((a) => a.id)
    .sort()
    .join("|");
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    hash = (hash << 5) - hash + ids.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function countNewArticles(
  articles: Article[],
  previousIds: string[],
): number {
  const prev = new Set(previousIds);
  return articles.filter((a) => !prev.has(a.id)).length;
}
