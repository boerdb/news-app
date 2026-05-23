import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { FeedList } from "@/components/headlines/FeedList";
import { getAggregatedFeed } from "@/lib/feed";
import { getSourceById } from "@/lib/sources";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SourcePage({ params }: PageProps) {
  const { id } = await params;
  const source = getSourceById(id);
  if (!source) notFound();

  const feed = await getAggregatedFeed({ sourceId: id });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-6 pb-28">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar overzicht
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {source.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          <a
            href={source.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {source.homepage}
          </a>
        </p>
        <div className="mt-6">
          <FeedList articles={feed.articles} sources={feed.sources} />
        </div>
      </main>
    </>
  );
}
