import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { redisConfigured, redisGet, redisSet } from "./redis";
import type { PushSubscriptionJSON } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const KEYS = {
  fingerprint: "fingerprint",
  previousArticleIds: "previousArticleIds",
  subscriptions: "subscriptions",
  lastPushAt: "lastPushAt",
} as const;

type StoreData = {
  fingerprint: string;
  previousArticleIds: string[];
  subscriptions: PushSubscriptionJSON[];
  lastPushAt: number;
};

const defaultStore = (): StoreData => ({
  fingerprint: "",
  previousArticleIds: [],
  subscriptions: [],
  lastPushAt: 0,
});

function kvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() &&
      process.env.KV_REST_API_TOKEN?.trim(),
  );
}

type Backend = "redis" | "kv" | "file";

function activeBackend(): Backend {
  if (redisConfigured()) return "redis";
  if (kvConfigured()) return "kv";
  return "file";
}

async function remoteGet<T>(key: string): Promise<T | null> {
  const backend = activeBackend();
  if (backend === "redis") {
    return redisGet<T>(key);
  }
  if (backend === "kv") {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<T>(`news-app:${key}`)) ?? null;
  }
  return null;
}

async function remoteSet(key: string, value: unknown): Promise<void> {
  const backend = activeBackend();
  if (backend === "redis") {
    await redisSet(key, value);
    return;
  }
  if (backend === "kv") {
    const { kv } = await import("@vercel/kv");
    await kv.set(`news-app:${key}`, value);
  }
}

async function readFileStore(): Promise<StoreData> {
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    return { ...defaultStore(), ...JSON.parse(raw) };
  } catch {
    return defaultStore();
  }
}

async function writeFileStore(data: StoreData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function mutateFileStore(
  fn: (store: StoreData) => void | Promise<void>,
): Promise<void> {
  const store = await readFileStore();
  await fn(store);
  await writeFileStore(store);
}

function usesRemoteStore(): boolean {
  return activeBackend() !== "file";
}

export async function getFingerprint(): Promise<string> {
  if (usesRemoteStore()) {
    return (await remoteGet<string>(KEYS.fingerprint)) ?? "";
  }
  return (await readFileStore()).fingerprint;
}

export async function setFingerprint(
  fingerprint: string,
  articleIds: string[],
): Promise<void> {
  if (usesRemoteStore()) {
    await remoteSet(KEYS.fingerprint, fingerprint);
    await remoteSet(KEYS.previousArticleIds, articleIds);
    return;
  }
  await mutateFileStore((store) => {
    store.fingerprint = fingerprint;
    store.previousArticleIds = articleIds;
  });
}

export async function getPreviousArticleIds(): Promise<string[]> {
  if (usesRemoteStore()) {
    return (await remoteGet<string[]>(KEYS.previousArticleIds)) ?? [];
  }
  return (await readFileStore()).previousArticleIds;
}

export async function getSubscriptions(): Promise<PushSubscriptionJSON[]> {
  if (usesRemoteStore()) {
    return (await remoteGet<PushSubscriptionJSON[]>(KEYS.subscriptions)) ?? [];
  }
  return (await readFileStore()).subscriptions;
}

function mergeSubscription(
  existing: PushSubscriptionJSON | undefined,
  sub: PushSubscriptionJSON,
): PushSubscriptionJSON {
  const merged: PushSubscriptionJSON = {
    endpoint: sub.endpoint,
    keys: sub.keys,
    sourceIds: existing?.sourceIds,
  };
  if (sub.sourceIds?.length) {
    merged.sourceIds = sub.sourceIds;
  }
  return merged;
}

export async function addSubscription(
  sub: PushSubscriptionJSON,
): Promise<void> {
  if (usesRemoteStore()) {
    const subs = await getSubscriptions();
    const idx = subs.findIndex((s) => s.endpoint === sub.endpoint);
    if (idx >= 0) {
      subs[idx] = mergeSubscription(subs[idx], sub);
    } else {
      subs.push(sub);
    }
    await remoteSet(KEYS.subscriptions, subs);
    return;
  }
  await mutateFileStore((store) => {
    const idx = store.subscriptions.findIndex(
      (s) => s.endpoint === sub.endpoint,
    );
    if (idx >= 0) {
      store.subscriptions[idx] = mergeSubscription(store.subscriptions[idx], sub);
    } else {
      store.subscriptions.push(sub);
    }
  });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (usesRemoteStore()) {
    const subs = (await getSubscriptions()).filter(
      (s) => s.endpoint !== endpoint,
    );
    await remoteSet(KEYS.subscriptions, subs);
    return;
  }
  await mutateFileStore((store) => {
    store.subscriptions = store.subscriptions.filter(
      (s) => s.endpoint !== endpoint,
    );
  });
}

export async function getLastPushAt(): Promise<number> {
  if (usesRemoteStore()) {
    return (await remoteGet<number>(KEYS.lastPushAt)) ?? 0;
  }
  return (await readFileStore()).lastPushAt;
}

export async function setLastPushAt(ts: number): Promise<void> {
  if (usesRemoteStore()) {
    await remoteSet(KEYS.lastPushAt, ts);
    return;
  }
  await mutateFileStore((store) => {
    store.lastPushAt = ts;
  });
}

export function getStoreBackend(): Backend {
  return activeBackend();
}
