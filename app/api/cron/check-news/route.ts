import { NextRequest, NextResponse } from "next/server";
import { getAggregatedFeed } from "@/lib/feed";
import { computeFingerprint, countNewArticles } from "@/lib/rss-aggregator";
import { PUSH_COOLDOWN_MS, sendNewsPushToSubscriber } from "@/lib/push";
import { NEWS_SOURCES } from "@/lib/sources";
import {
  getFingerprint,
  getLastPushAt,
  getPreviousArticleIds,
  getSeenIdsBySource,
  getSubscriptions,
  mergeSeenIdsBySource,
  setFingerprint,
  setLastPushAt,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  const querySecret = request.nextUrl.searchParams.get("secret");

  if (secret) {
    const token = auth?.replace(/^Bearer\s+/i, "") ?? querySecret;
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const feed = await getAggregatedFeed();
  const fingerprint = computeFingerprint(feed.articles);
  const previous = await getFingerprint();
  const previousIds = await getPreviousArticleIds();

  const sourceNameById = Object.fromEntries(
    NEWS_SOURCES.map((s) => [s.id, s.name]),
  );

  let pushResult = { sent: 0, failed: 0, skipped: 0 };
  const lastPush = await getLastPushAt();
  const canPush = Date.now() - lastPush >= PUSH_COOLDOWN_MS;

  const seenBySource = await getSeenIdsBySource();

  if (canPush) {
    const subs = await getSubscriptions();
    for (const sub of subs) {
      const allowed = sub.sourceIds?.filter(Boolean) ?? [];
      if (allowed.length === 0) {
        pushResult.skipped++;
        continue;
      }

      let newCount = 0;
      for (const sourceId of allowed) {
        const articles = feed.articlesBySource[sourceId] ?? [];
        const seen = seenBySource[sourceId] ?? [];
        newCount += countNewArticles(articles, seen);
      }
      if (newCount <= 0) continue;

      const label =
        allowed.length === 1
          ? sourceNameById[allowed[0]]
          : allowed
              .map((id) => sourceNameById[id])
              .filter(Boolean)
              .slice(0, 3)
              .join(", ") + (allowed.length > 3 ? ` +${allowed.length - 3}` : "");

      const ok = await sendNewsPushToSubscriber(sub, newCount, label);
      if (ok) pushResult.sent++;
      else pushResult.failed++;
    }
    if (pushResult.sent > 0) {
      await setLastPushAt(Date.now());
    }
  }

  const newCount = countNewArticles(feed.articles, previousIds);

  const idsBySource = Object.fromEntries(
    Object.entries(feed.articlesBySource).map(([sourceId, articles]) => [
      sourceId,
      articles.map((a) => a.id),
    ]),
  );
  await mergeSeenIdsBySource(idsBySource);

  await setFingerprint(
    fingerprint,
    feed.articles.map((a) => a.id),
  );

  return NextResponse.json({
    ok: true,
    fingerprint,
    previous,
    newCount,
    canPush,
    push: pushResult,
    articleCount: feed.articles.length,
  });
}
