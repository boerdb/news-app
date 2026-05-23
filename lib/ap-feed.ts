import Parser from "rss-parser";
import type { NewsSource } from "./types";
import type { Article, SourceStatus } from "./types";

const AP_S3_URL =
  "http://associated-press.s3-website-us-east-1.amazonaws.com/topnews.xml";
/** Fallback when the unofficial AP S3 mirror is down or empty. */
const AP_FALLBACK_RSS = "https://abcnews.go.com/abcnews/topstories";

const parser = new Parser({
  timeout: 12_000,
  headers: {
    "User-Agent": "NewsHeadlinesPWA/1.0 (+https://github.com/boerdb/news-app)",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
});

const PER_SOURCE_LIMIT = 12;

function articleId(sourceId: string, link: string): string {
  return `${sourceId}:${link}`;
}

function pickImage(item: Parser.Item): string | undefined {
  const enclosure = item.enclosure;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return enclosure.url;
  }
  const html = item.content ?? item.summary ?? "";
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1];
}

function pickSummary(item: Parser.Item): string | undefined {
  const raw = item.contentSnippet ?? item.summary ?? "";
  const plain = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return undefined;
  return plain.slice(0, 200);
}

function mapRssItems(
  source: NewsSource,
  items: Parser.Item[],
): Article[] {
  return items
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
        summary: pickSummary(item),
      };
    })
    .filter((a) => a.link.length > 0);
}

async function tryParseRss(
  source: NewsSource,
  url: string,
): Promise<Article[] | null> {
  try {
    const feed = await parser.parseURL(url);
    const articles = mapRssItems(source, feed.items ?? []);
    return articles.length > 0 ? articles : null;
  } catch {
    return null;
  }
}

export async function fetchApFeed(
  source: NewsSource,
): Promise<{ articles: Article[]; status: SourceStatus }> {
  const primary = await tryParseRss(source, AP_S3_URL);
  if (primary?.length) {
    return {
      articles: primary.map((a) => ({ ...a, sourceName: source.name })),
      status: {
        sourceId: source.id,
        sourceName: source.name,
        ok: true,
        count: primary.length,
      },
    };
  }

  const fallback = await tryParseRss(source, AP_FALLBACK_RSS);
  if (fallback?.length) {
    return {
      articles: fallback.map((a) => ({ ...a, sourceName: source.name })),
      status: {
        sourceId: source.id,
        sourceName: source.name,
        ok: true,
        count: fallback.length,
      },
    };
  }

  return {
    articles: [],
    status: {
      sourceId: source.id,
      sourceName: source.name,
      ok: false,
      error: "AP-feed niet beschikbaar (S3-mirror en fallback mislukt)",
      count: 0,
    },
  };
}
