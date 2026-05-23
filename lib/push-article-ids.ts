/** Article id format: `{sourceId}:{link}` */
export function articleSourceId(articleId: string): string {
  const sep = articleId.indexOf(":");
  return sep >= 0 ? articleId.slice(0, sep) : articleId;
}

export function filterPreviousIdsForSources(
  previousIds: string[],
  allowedSourceIds: string[],
): string[] {
  const allowed = new Set(allowedSourceIds);
  return previousIds.filter((id) => allowed.has(articleSourceId(id)));
}
