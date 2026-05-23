import { NextRequest, NextResponse } from "next/server";
import { getAggregatedFeed } from "@/lib/feed";
import { countNewArticles } from "@/lib/rss-aggregator";
import type { Region } from "@/lib/types";

export const revalidate = 300;

function parseRegion(value: string | null): Region | "all" {
  if (value === "nl" || value === "en" || value === "de" || value === "us") {
    return value;
  }
  return "all";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const region = parseRegion(searchParams.get("region"));
  const sourceId = searchParams.get("source") ?? undefined;
  const sinceRaw = searchParams.get("since");

  const feed = await getAggregatedFeed({ region, sourceId });

  let newCount = 0;
  if (sinceRaw) {
    try {
      const previousIds = JSON.parse(sinceRaw) as string[];
      if (Array.isArray(previousIds)) {
        newCount = countNewArticles(feed.articles, previousIds);
      }
    } catch {
      // ignore invalid since param
    }
  }

  return NextResponse.json({
    ...feed,
    newCount,
  });
}
