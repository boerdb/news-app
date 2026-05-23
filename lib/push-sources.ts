export const PUSH_SOURCES_KEY = "news-app:pushSources";

export function getPushSourceIds(allSourceIds: string[]): string[] {
  if (typeof localStorage === "undefined") return [...allSourceIds];
  try {
    const raw = localStorage.getItem(PUSH_SOURCES_KEY);
    if (!raw) return [...allSourceIds];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...allSourceIds];
    return parsed.filter(
      (id): id is string => typeof id === "string" && allSourceIds.includes(id),
    );
  } catch {
    return [...allSourceIds];
  }
}

export function setPushSourceIds(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PUSH_SOURCES_KEY, JSON.stringify(ids));
}
