import { HeadlineCard } from "./HeadlineCard";
import type { Article, SourceStatus } from "@/lib/types";

type Props = {
  articles: Article[];
  sources: SourceStatus[];
};

export function FeedList({ articles, sources }: Props) {
  const failed = sources.filter((s) => !s.ok);

  return (
    <div className="w-full min-w-0 space-y-4">
      {failed.length > 0 ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
        >
          Sommige bronnen zijn tijdelijk niet bereikbaar:{" "}
          {failed.map((s) => s.sourceName).join(", ")}.
        </div>
      ) : null}

      {articles.length === 0 ? (
        <p className="py-12 text-center text-slate-500">
          Geen headlines gevonden voor dit filter.
        </p>
      ) : (
        articles.map((article) => (
          <HeadlineCard key={article.id} article={article} />
        ))
      )}
    </div>
  );
}
