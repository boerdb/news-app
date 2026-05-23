import type { NewsSource, Region } from "./types";

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "nos",
    name: "NOS",
    region: "nl",
    language: "nl",
    feedUrl: "https://feeds.nos.nl/nosnieuwsalgemeen",
    homepage: "https://nos.nl",
  },
  {
    id: "omrop-fryslan",
    name: "Omrop Fryslân",
    region: "nl",
    language: "nl",
    feedUrl: "https://www.omropfryslan.nl/rss/nieuws.xml",
    homepage: "https://www.omropfryslan.nl",
  },
  {
    id: "geenstijl",
    name: "GeenStijl",
    region: "nl",
    language: "nl",
    feedUrl: "https://www.geenstijl.nl/feeds/recent.atom",
    homepage: "https://www.geenstijl.nl",
  },
  {
    id: "bbc",
    name: "BBC News",
    region: "en",
    language: "en",
    feedUrl: "https://feeds.bbci.co.uk/news/rss.xml",
    homepage: "https://www.bbc.com/news",
  },
  {
    id: "reuters",
    name: "Reuters",
    region: "en",
    language: "en",
    feedUrl: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    homepage: "https://www.reuters.com",
  },
  {
    id: "tagesschau",
    name: "Tagesschau",
    region: "de",
    language: "de",
    feedUrl: "https://www.tagesschau.de/index~rss2.xml",
    homepage: "https://www.tagesschau.de",
  },
  {
    id: "spiegel",
    name: "Der Spiegel",
    region: "de",
    language: "de",
    feedUrl: "https://www.spiegel.de/schlagzeilen/index.rss",
    homepage: "https://www.spiegel.de",
  },
  {
    id: "npr",
    name: "NPR",
    region: "us",
    language: "en",
    feedUrl: "https://feeds.npr.org/1001/rss.xml",
    homepage: "https://www.npr.org",
  },
  {
    id: "ap",
    name: "AP News",
    region: "us",
    language: "en",
    feedUrl: "https://apnews.com/index.rss",
    homepage: "https://apnews.com",
  },
];

export const REGION_LABELS: Record<Region | "all", string> = {
  all: "Alles",
  nl: "Nederland",
  en: "Engels",
  de: "Duitsland",
  us: "VS",
};

export function getSourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find((s) => s.id === id);
}

export function getSourcesByRegion(region: Region | "all"): NewsSource[] {
  if (region === "all") return NEWS_SOURCES;
  return NEWS_SOURCES.filter((s) => s.region === region);
}
