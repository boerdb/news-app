import type { NewsSource } from "./types";
import type { Article, SourceStatus } from "./types";

const SITEMAP_URL =
  "https://www.reuters.com/arc/outboundfeeds/news-sitemap/?outputType=xml";
const PER_SOURCE_LIMIT = 12;
const FETCH_TIMEOUT_MS = 14_000;

/** English Reuters World section (matches https://www.reuters.com/world/). */
function isWorldArticleUrl(loc: string): boolean {
  try {
    const path = new URL(loc).pathname;
    if (!path.startsWith("/world/")) return false;
    return !/^\/(es|fr|pt|de|it|ru|ar|zh)\//.test(path);
  } catch {
    return false;
  }
}

function decodeXmlText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function articleId(sourceId: string, link: string): string {
  return `${sourceId}:${link}`;
}

export async function fetchReutersWorldFeed(
  source: NewsSource,
): Promise<{ articles: Article[]; status: SourceStatus }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(SITEMAP_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NewsHeadlinesPWA/1.0 (+https://github.com/boerdb/news-app)",
        Accept: "application/xml, text/xml",
      },
      next: { revalidate: 300 },
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const xml = await res.text();
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    const articles: Article[] = [];

    for (const block of blocks) {
      if (articles.length >= PER_SOURCE_LIMIT) break;

      const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
      const loc = locMatch?.[1]?.trim() ?? "";
      if (!loc || !isWorldArticleUrl(loc)) continue;

      const titleMatch = block.match(/<news:title>([\s\S]*?)<\/news:title>/);
      const dateMatch = block.match(
        /<news:publication_date>([^<]+)<\/news:publication_date>/,
      );
      const imageMatch = block.match(/<image:loc>([^<]+)<\/image:loc>/);

      const title = decodeXmlText(titleMatch?.[1] ?? "");
      if (!title) continue;

      const publishedAt = dateMatch?.[1]
        ? new Date(dateMatch[1]).toISOString()
        : new Date().toISOString();

      articles.push({
        id: articleId(source.id, loc),
        title,
        link: loc,
        publishedAt,
        sourceId: source.id,
        sourceName: source.name,
        region: source.region,
        imageUrl: imageMatch?.[1]
          ? decodeXmlText(imageMatch[1].trim())
          : undefined,
      });
    }

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
