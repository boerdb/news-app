import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/store";

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "endpoint vereist" }, { status: 400 });
    }
    await removeSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kon niet verwijderen" }, { status: 500 });
  }
}
