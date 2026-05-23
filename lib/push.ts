import webpush from "web-push";
import type { PushSubscriptionJSON } from "./types";

const PUSH_COOLDOWN_MS = 15 * 60 * 1000;

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() ?? "mailto:news@app.local";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

function pushBody(newCount: number, sourceLabel?: string): string {
  const countText =
    newCount === 1
      ? "1 nieuw bericht"
      : `${newCount} nieuwe berichten`;
  if (sourceLabel) {
    return `${sourceLabel}: ${countText}`;
  }
  return newCount === 1 ? "Er is 1 nieuw bericht" : `Er zijn ${countText}`;
}

export async function sendNewsPush(
  subscriptions: PushSubscriptionJSON[],
  newCount: number,
  sourceLabel?: string,
): Promise<{ sent: number; failed: number }> {
  if (!configureWebPush() || subscriptions.length === 0 || newCount <= 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: "Nieuwe headlines",
    body: pushBody(newCount, sourceLabel),
    url: "/",
    tag: "news-update",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch {
        failed++;
      }
    }),
  );

  return { sent, failed };
}

export async function sendNewsPushToSubscriber(
  sub: PushSubscriptionJSON,
  newCount: number,
  sourceLabel?: string,
): Promise<boolean> {
  if (!configureWebPush() || newCount <= 0) return false;

  const payload = JSON.stringify({
    title: "Nieuwe headlines",
    body: pushBody(newCount, sourceLabel),
    url: "/",
    tag: "news-update",
  });

  try {
    await webpush.sendNotification(sub, payload);
    return true;
  } catch {
    return false;
  }
}

export { PUSH_COOLDOWN_MS };
