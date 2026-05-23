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
      : [];
    if (sourceIds.length === 0) {
      return NextResponse.json(
        { error: "Selecteer minstens één bron voor meldingen" },
        { status: 400 },
      );
    }
    await addSubscription({
      endpoint: body.endpoint,
      keys: body.keys,
      sourceIds,
    });
    return NextResponse.json({ ok: true, sourceIds });
  } catch {
    return NextResponse.json({ error: "Kon niet opslaan" }, { status: 500 });
  }
}
