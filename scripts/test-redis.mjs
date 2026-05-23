/**
 * Redis-verbinding testen. Gebruik:
 *   node scripts/test-redis.mjs
 *   REDIS_URL=redis://192.168.1.14:6379 node scripts/test-redis.mjs
 */
import { createClient } from "redis";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^REDIS_URL=(.+)$/);
    if (m && !process.env.REDIS_URL) {
      process.env.REDIS_URL = m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const url = process.env.REDIS_URL?.trim();
if (!url) {
  console.log("❌ REDIS_URL niet gezet (.env.local of omgevingsvariabele)");
  process.exit(1);
}

const safeUrl = url.replace(/:([^:@/]+)@/, ":***@");
console.log("Verbinden met:", safeUrl);

const client = createClient({
  url,
  socket: { connectTimeout: 8_000, reconnectStrategy: false },
});

let lastError = "";
client.on("error", (e) => {
  lastError = e.message;
});

try {
  await client.connect();
  const pong = await client.ping();
  console.log("✅ PING →", pong);

  const testKey = "news-app:connection-test";
  await client.set(testKey, JSON.stringify({ at: new Date().toISOString() }));
  const val = await client.get(testKey);
  console.log("✅ SET/GET test →", val);

  const keys = await client.keys("news-app:*");
  console.log("📋 Bestaande news-app keys:", keys.length ? keys : "(nog geen)");

  await client.quit();
  console.log("\nRedis werkt. Zet dezelfde REDIS_URL in .env.local en herstart npm run dev.");
} catch (err) {
  const msg = err.message || lastError;
  console.error("\n❌ Verbinding mislukt:", msg);
  try {
    await client.destroy();
  } catch {
    // ignore
  }
  if (msg.includes("protected mode")) {
    console.log("\n💡 Redis draait, maar blokkeert verbindingen vanaf andere computers.");
    console.log("   Optie A (aanbevolen): SSH-tunnel op je PC:");
    console.log("     ssh -L 6379:127.0.0.1:6379 root@192.168.1.14");
    console.log("     REDIS_URL=redis://127.0.0.1:6379");
    console.log("   Optie B: op de server (via SSH) protected-mode uit + LAN-bind:");
    console.log("     redis-cli CONFIG SET protected-mode no");
    console.log("     redis-cli CONFIG REWRITE");
  } else {
    console.log("\nMogelijke oorzaken:");
    console.log("  • Redis draait niet (systemctl status redis-server)");
    console.log("  • Firewall op poort 6379");
    console.log("  • Verkeerd wachtwoord in REDIS_URL");
  }
  process.exit(1);
}
