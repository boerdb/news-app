import { NextResponse } from "next/server";
import { redisConfigured, redisPing } from "@/lib/redis";
import { getStoreBackend } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!redisConfigured()) {
    return NextResponse.json({
      configured: false,
      backend: getStoreBackend(),
      ok: true,
      message: "REDIS_URL niet gezet; gebruikt file of Vercel KV",
    });
  }

  const ok = await redisPing();
  return NextResponse.json({
    configured: true,
    backend: getStoreBackend(),
    ok,
    message: ok ? "Redis bereikbaar" : "Redis niet bereikbaar",
  });
}
