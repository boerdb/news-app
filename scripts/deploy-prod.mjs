/**
 * Productie-deploy naar Next.js server.
 * Gebruik: DEPLOY_HOST=192.168.1.32 DEPLOY_PASS=... node scripts/deploy-prod.mjs
 */
import { Client } from "ssh2";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const HOST = process.env.DEPLOY_HOST || "192.168.1.32";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_PASS;
const APP_DIR = "/var/www/news-app";
const REPO = "https://github.com/boerdb/news-app.git";
const REDIS_URL = process.env.REDIS_URL || "redis://192.168.1.14:6379";
const PORT = process.env.APP_PORT || "3010";

if (!PASS) {
  console.error("Zet DEPLOY_PASS (SSH-wachtwoord)");
  process.exit(1);
}

function exec(conn, cmd, label) {
  return new Promise((resolvePromise, reject) => {
    console.log(`\n▶ ${label || cmd.slice(0, 80)}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream
        .on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Exit ${code}: ${out.slice(-500)}`));
          } else resolvePromise(out);
        })
        .on("data", (d) => {
          const s = d.toString();
          out += s;
          process.stdout.write(s);
        })
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  });
}

function shell(conn) {
  return {
    run: (cmd, label) => exec(conn, cmd, label),
  };
}

function parseEnvValue(text, key) {
  const m = text.match(new RegExp(`^${key}=(.+)$`, "m"));
  return m?.[1]?.trim() ?? "";
}

function generateVapid() {
  const out = execSync("npx web-push generate-vapid-keys", {
    encoding: "utf8",
    cwd: resolve(process.cwd()),
  });
  const pub = out.match(/Public Key:\s*\n(.+)/);
  const priv = out.match(/Private Key:\s*\n(.+)/);
  return {
    public: pub?.[1]?.trim() ?? "",
    private: priv?.[1]?.trim() ?? "",
  };
}

async function main() {
  const conn = new Client();
  await new Promise((resolvePromise, reject) => {
    conn
      .on("ready", resolvePromise)
      .on("error", reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS });
  });

  const sh = shell(conn);

  try {
    await sh.run("node -v && npm -v && pm2 -v", "Check node/npm/pm2");

    const hasDir = await sh.run(`test -d ${APP_DIR} && echo yes || echo no`, "Check app dir");

    let existingEnv = "";
    if (hasDir.includes("yes")) {
      try {
        existingEnv = await sh.run(`cat ${APP_DIR}/.env.local 2>/dev/null || true`, "Read .env.local");
      } catch {
        existingEnv = "";
      }
    }

    const existingPublic = parseEnvValue(existingEnv, "NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    const existingPrivate = parseEnvValue(existingEnv, "VAPID_PRIVATE_KEY");
    const existingCron = parseEnvValue(existingEnv, "CRON_SECRET");

    let vapidPublic = existingPublic;
    let vapidPrivate = existingPrivate;
    if (!vapidPublic || !vapidPrivate) {
      const fresh = generateVapid();
      vapidPublic = fresh.public;
      vapidPrivate = fresh.private;
      console.log("\nℹ️  Nieuwe VAPID-sleutels (push opnieuw inschakelen in de app)");
    } else {
      console.log("\nℹ️  Bestaande VAPID-sleutels behouden");
    }

    const cronSecret =
      process.env.CRON_SECRET ||
      existingCron ||
      execSync("node -e \"console.log(require('crypto').randomBytes(24).toString('hex'))\"", {
        encoding: "utf8",
      }).trim();

    const envContent = `# news-app production — gegenereerd ${new Date().toISOString()}
NODE_ENV=production
PORT=${PORT}
REDIS_URL=${REDIS_URL}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidPublic}
VAPID_PRIVATE_KEY=${vapidPrivate}
VAPID_SUBJECT=mailto:boerdb@users.noreply.github.com
CRON_SECRET=${cronSecret}
`;
    if (hasDir.includes("yes")) {
      await sh.run(`cd ${APP_DIR} && git pull origin main`, "Git pull");
    } else {
      await sh.run(
        `mkdir -p /var/www && cd /var/www && git clone ${REPO} news-app || (cd news-app && git pull origin main)`,
        "Git clone",
      );
    }

    const envB64 = Buffer.from(envContent).toString("base64");
    await sh.run(
      `echo '${envB64}' | base64 -d > ${APP_DIR}/.env.local && chmod 600 ${APP_DIR}/.env.local`,
      "Write .env.local",
    );

    await sh.run(
      `cd ${APP_DIR} && npm ci && npm run build`,
      "npm ci + build",
    );

    const pm2Start = `cd ${APP_DIR} && pm2 delete news-app 2>/dev/null; PORT=${PORT} pm2 start npm --name news-app -- start && pm2 save`;
    await sh.run(pm2Start, "PM2 start");

    const cronLine = `*/5 * * * * curl -fsS -H "Authorization: Bearer ${cronSecret}" http://127.0.0.1:${PORT}/api/cron/check-news >/dev/null 2>&1`;
    await sh.run(
      `(crontab -l 2>/dev/null | grep -v news-app-cron; echo "${cronLine}") | crontab -`,
      "Cron job (elke 5 min)",
    );

    console.log("\n✅ Deploy klaar");
    console.log(`   App: http://${HOST}:${PORT}`);
    console.log(`   VAPID public (voor eventuele copy): ${vapidPublic.slice(0, 20)}...`);
    console.log(`   CRON_SECRET opgeslagen in ${APP_DIR}/.env.local`);
  } finally {
    conn.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Deploy mislukt:", err.message);
  process.exit(1);
});
