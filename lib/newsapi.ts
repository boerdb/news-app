import type { Article, Region } from "./types";

const NEWS_API_URL = "https://newsapi.org/v2/top-headlines";

const REGION_COUNTRY: Record<Region, string> = {
  nl: "nl",
  en: "gb",
  de: "de",
  us: "us",
};

export function isNewsApiEnabled(): boolean {
  return Boolean(process.env.NEWS_API_KEY?.trim());
}

export async function fetchNewsApiHeadlines(
  region?: Region | "all",
): Promise<Article[]> {
  const apiKey = process.env.NEWS_API_KEY?.trim();
  if (!apiKey) return [];

  const regions: Region[] =
    region && region !== "all"
      ? [region]
      : (["nl", "en", "de", "us"] as Region[]);

  const articles: Article[] = [];

  await Promise.all(
    regions.map(async (r) => {
      try {
        const url = new URL(NEWS_API_URL);
        url.searchParams.set("country", REGION_COUNTRY[r]);
        url.searchParams.set("pageSize", "10");
        url.searchParams.set("apiKey", apiKey);

        const res = await fetch(url.toString(), {
          next: { revalidate: 300 },
        });
        if (!res.ok) return;

        const data = (await res.json()) as {
          articles?: Array<{
            title?: string;
            url?: string;
            publishedAt?: string;
            urlToImage?: string;
            description?: string;
            source?: { name?: string };
          }>;
        };

        for (const item of data.articles ?? []) {
          if (!item.url || !item.title) continue;
          articles.push({
            id: `newsapi:${r}:${item.url}`,
            title: item.title,
            link: item.url,
            publishedAt: item.publishedAt ?? new Date().toISOString(),
            sourceId: `newsapi-${r}`,
            sourceName: item.source?.name ?? "News API",
            region: r,
            imageUrl: item.urlToImage ?? undefined,
            summary: item.description,
          });
        }
      } catch {
        // News API is optional enrichment
      }
    }),
  );

  return articles;
}
