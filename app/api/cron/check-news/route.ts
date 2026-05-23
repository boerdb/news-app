import { NextRequest, NextResponse } from "next/server";
import { getAggregatedFeed } from "@/lib/feed";
import { computeFingerprint, countNewArticles } from "@/lib/rss-aggregator";
import { PUSH_COOLDOWN_MS, sendNewsPush } from "@/lib/push";
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

  const newCount =
    previous && previous !== fingerprint
      ? countNewArticles(feed.articles, previousIds)
      : 0;

  let pushResult = { sent: 0, failed: 0 };

  if (newCount > 0) {
    const lastPush = await getLastPushAt();
    if (Date.now() - lastPush >= PUSH_COOLDOWN_MS) {
      const subs = await getSubscriptions();
      pushResult = await sendNewsPush(subs, newCount);
      if (pushResult.sent > 0) {
        await setLastPushAt(Date.now());
      }
    }
  }

  await setFingerprint(
    fingerprint,
    feed.articles.slice(0, 30).map((a) => a.id),
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
