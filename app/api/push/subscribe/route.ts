import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/lib/store";
import type { PushSubscriptionJSON } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PushSubscriptionJSON;
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Ongeldige subscription" }, { status: 400 });
    }
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds.filter((id): id is string => typeof id === "string")
      : undefined;
    await addSubscription({
      endpoint: body.endpoint,
      keys: body.keys,
      sourceIds: sourceIds?.length ? sourceIds : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kon niet opslaan" }, { status: 500 });
  }
}
