# Headlines — Nieuws PWA

Multi-bron nieuws-headlines (NL, EN, DE, VS) als Next.js PWA met donker/licht thema, install-banner en Web Push bij nieuw nieuws.

## Functies

- **SSR/ISR** — homepage server-rendered, feed cache 5 minuten
- **RSS** — NOS, Omrop Fryslân, BBC, Reuters, Tagesschau, Spiegel, NPR, AP
- **Optioneel News API** — zet `NEWS_API_KEY` voor extra headlines
- **PWA** — installeerbaar op iOS/Android, offline cache via service worker
- **Web Push** — cron controleert elke 5 min op nieuwe artikelen

## Ontwikkeling

```bash
npm install
npm run icons
npm run dev
```

PWA staat in development uit; test install/push met `npm run build && npm start`.

## VAPID-sleutels

```bash
npx web-push generate-vapid-keys
```

Kopieer public/private key naar `.env.local` (zie `.env.example`).

## Cron lokaal testen

```bash
curl -H "Authorization: Bearer JOUW_CRON_SECRET" http://localhost:3000/api/cron/check-news
```

## Redis (eigen server)

De app gebruikt **Redis** als `REDIS_URL` is gezet (anders `.data/` lokaal of Vercel KV).

1. Maak `.env.local` aan (niet committen) met bijvoorbeeld:

   ```
   REDIS_URL=redis://:JOUW_REDIS_WACHTWOORD@192.168.1.14:6379
   ```

   Zonder wachtwoord: `redis://192.168.1.14:6379`

2. Op de Redis-host moet poort **6379** bereikbaar zijn vanaf je dev-machine (`bind` / firewall). Test:

   ```bash
   curl http://localhost:3000/api/health/redis
   ```

3. **Alleen via SSH** (Redis luistert op localhost op de server):

   ```bash
   ssh -L 6379:127.0.0.1:6379 root@192.168.1.14
   ```

   In `.env.local`: `REDIS_URL=redis://127.0.0.1:6379`

Opslag-sleutels in Redis: `news-app:fingerprint`, `news-app:subscriptions`, enz.

Test verbinding:

```bash
npm run test:redis
```

### Veelvoorkomend: "protected mode"

Redis op een server accepteert dan alleen verbindingen vanaf `localhost`. Oplossing:

**A — SSH-tunnel (veilig, geen Redis-config wijzigen):**

```bash
ssh -L 6379:127.0.0.1:6379 root@192.168.1.14
```

In `.env.local`: `REDIS_URL=redis://127.0.0.1:6379` (tunnel moet open blijven).

**B — LAN-toegang op de server** (alleen thuisnetwerk, niet via internet):

```bash
ssh root@192.168.1.14
redis-cli CONFIG SET protected-mode no
redis-cli CONFIG SET bind "0.0.0.0 ::1"
redis-cli CONFIG REWRITE
sudo systemctl restart redis-server
```

`root` / SSH-wachtwoord ≠ Redis-wachtwoord; jouw server had **geen** Redis-wachtwoord ingesteld.

## Deploy (Vercel)

1. Push naar GitHub en importeer in Vercel
2. Voeg environment variables toe (`.env.example`)
3. Zet `REDIS_URL` naar je server, of koppel Vercel KV als fallback
4. `CRON_SECRET` wordt automatisch gebruikt door Vercel Cron

## iOS push

Web Push op iOS werkt alleen als de app op het **beginscherm** staat (iOS 16.4+). Gebruik de install-banner: Deel → Zet op beginscherm.

## Bronnen

RSS-feeds kunnen tijdelijk falen; de app toont dan een waarschuwing per bron zonder de hele feed te blokkeren.
