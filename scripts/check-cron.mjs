import { Client } from "ssh2";

const HOST = process.env.DEPLOY_HOST || "192.168.1.32";
const PASS = process.env.DEPLOY_PASS;
const CRON_SECRET =
  process.env.CRON_SECRET ||
  "7a82a57314ff9af2b537447ef30c4e8e44c601b32831ddf7";

if (!PASS) {
  console.error("Zet DEPLOY_PASS");
  process.exit(1);
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream
        .on("close", (code) =>
          code === 0 ? resolve(out) : reject(new Error(`exit ${code}: ${out}`)),
        )
        .on("data", (d) => {
          out += d.toString();
        })
        .stderr.on("data", (d) => {
          out += d.toString();
        });
    });
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      console.log("=== Crontab ===");
      console.log(
        await exec(conn, "crontab -l 2>/dev/null || echo '(geen crontab)'"),
      );
      console.log("\n=== PM2 news-app ===");
      console.log(
        await exec(
          conn,
          "pm2 describe news-app 2>/dev/null | grep -E 'status|uptime|restarts' | head -5 || pm2 list | grep news-app",
        ),
      );
      console.log("\n=== Cron API (handmatige test) ===");
      const api = await exec(
        conn,
        `curl -s -w "\\nhttp_code:%{http_code}" -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3010/api/cron/check-news`,
      );
      console.log(api);

      if (process.env.FIX_CRON === "1") {
        console.log("\n=== Crontab opschonen ===");
        const existing = await exec(conn, "crontab -l 2>/dev/null || true");
        const kept = existing
          .split("\n")
          .filter((line) => line.trim() && !line.includes("/api/cron/check-news"));
        const cronLine = `*/5 * * * * curl -fsS -H 'Authorization: Bearer ${CRON_SECRET}' http://127.0.0.1:3010/api/cron/check-news >/dev/null 2>&1`;
        const newCrontab = [...kept, cronLine, ""].join("\n");
        const b64 = Buffer.from(newCrontab).toString("base64");
        await exec(conn, `echo '${b64}' | base64 -d | crontab -`);
        console.log(await exec(conn, "crontab -l"));
      }
    } finally {
      conn.end();
    }
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  })
  .connect({ host: HOST, port: 22, username: "root", password: PASS });
