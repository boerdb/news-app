export const SEEN_ARTICLES_KEY = "news-app:lastSeenIds";

export function markArticlesSeen(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SEEN_ARTICLES_KEY, JSON.stringify(ids.slice(0, 50)));
}

export function getSeenArticleIds(): string[] | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SEEN_ARTICLES_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}
