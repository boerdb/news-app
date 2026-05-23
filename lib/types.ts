export type Region = "nl" | "en" | "de" | "us";

export type NewsSource = {
  id: string;
  name: string;
  region: Region;
  language: string;
  feedUrl: string;
  homepage: string;
};

export type Article = {
  id: string;
  title: string;
  link: string;
  publishedAt: string;
  sourceId: string;
  sourceName: string;
  region: Region;
  imageUrl?: string;
  summary?: string;
};

export type SourceStatus = {
  sourceId: string;
  sourceName: string;
  ok: boolean;
  error?: string;
  count: number;
};

export type FeedResult = {
  articles: Article[];
  fetchedAt: string;
  sources: SourceStatus[];
};

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  /** Empty or omitted = all sources. */
  sourceIds?: string[];
};
