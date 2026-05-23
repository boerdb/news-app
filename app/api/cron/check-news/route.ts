import { NextRequest, NextResponse } from "next/server";
import { getAggregatedFeed } from "@/lib/feed";
import { computeFingerprint, countNewArticles } from "@/lib/rss-aggregator";
import { filterPreviousIdsForSources } from "@/lib/push-article-ids";
import { PUSH_COOLDOWN_MS, sendNewsPushToSubscriber } from "@/lib/push";
import { NEWS_SOURCES } from "@/lib/sources";
import {
  getFingerprint,
  getLastPushAt,
  getPreviousArticleIds,
  getSubscriptions,
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

  const feedChanged = Boolean(previous && previous !== fingerprint);
  const sourceNameById = Object.fromEntries(
    NEWS_SOURCES.map((s) => [s.id, s.name]),
  );

  let pushResult = { sent: 0, failed: 0 };

  if (feedChanged) {
    const lastPush = await getLastPushAt();
    if (Date.now() - lastPush >= PUSH_COOLDOWN_MS) {
      const subs = await getSubscriptions();
      for (const sub of subs) {
        const allowed = sub.sourceIds?.filter(Boolean) ?? [];
        if (allowed.length === 0) continue;

        const filtered = feed.articles.filter((a) =>
          allowed.includes(a.sourceId),
        );
        const previousForSub = filterPreviousIdsForSources(previousIds, allowed);
        const newCount = countNewArticles(filtered, previousForSub);
        if (newCount <= 0) continue;

        const label =
          allowed.length === 1
            ? sourceNameById[allowed[0]]
            : allowed
                .map((id) => sourceNameById[id])
                .filter(Boolean)
                .slice(0, 3)
                .join(", ") +
              (allowed.length > 3 ? ` +${allowed.length - 3}` : "");

        const ok = await sendNewsPushToSubscriber(sub, newCount, label);
        if (ok) pushResult.sent++;
        else pushResult.failed++;
      }
      if (pushResult.sent > 0) {
        await setLastPushAt(Date.now());
      }
    }
  }

  const newCount = feedChanged
    ? countNewArticles(feed.articles, previousIds)
    : 0;

  await setFingerprint(
    fingerprint,
    feed.articles.map((a) => a.id),
  );

  return NextResponse.json({
    ok: true,
    fingerprint,
    previous,
    newCount,
    push: pushResult,
    articleCount: feed.articles.length,
  });
}
