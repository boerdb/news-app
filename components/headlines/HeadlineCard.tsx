import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Article } from "@/lib/types";

type Props = {
  article: Article;
};

export function HeadlineCard({ article }: Props) {
  const published = new Date(article.publishedAt);

  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-4">
        {article.imageUrl ? (
          <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block dark:bg-slate-800">
            <Image
              src={article.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="112px"
              unoptimized
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{article.sourceName}</Badge>
            <time
              dateTime={article.publishedAt}
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              {formatRelativeTime(published)}
            </time>
          </div>
          <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-50">
            <Link
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {article.title}
              <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
            </Link>
          </h2>
          {article.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {article.summary}
            </p>
          ) : null}
          <Link
            href={`/bron/${article.sourceId}`}
            className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Meer van {article.sourceName}
          </Link>
        </div>
      </div>
    </article>
  );
}
