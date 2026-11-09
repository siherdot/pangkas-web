import { promises as fs } from "node:fs";
import path from "node:path";

/** Ambil IP pengunjung dari header proxy (Cloudflare Tunnel → Traefik → app). */
export function clientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return normalize(cf);
  const xr = headers.get("x-real-ip");
  if (xr) return normalize(xr);
  const xff = headers.get("x-forwarded-for");
  if (xff) return normalize(xff.split(",")[0]);
  return "unknown";
}

function normalize(raw: string) {
  const ip = raw.trim().replace(/^::ffff:/, "");
  return ip || "unknown";
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "rate-limits.json");

const LIMIT_HOUR = Number(process.env.BOOKING_LIMIT_PER_HOUR || 5);
const LIMIT_DAY = Number(process.env.BOOKING_LIMIT_PER_DAY || 12);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Store = Record<string, number[]>;

let lock: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
}

async function read(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function write(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store), "utf8");
  await fs.rename(tmp, FILE);
}

export type RateResult = {
  allowed: boolean;
  hourCount: number;
  dayCount: number;
  retryMinutes: number;
  limitHour: number;
  limitDay: number;
};

/**
 * Catat satu percobaan booking dari IP ini lalu putuskan boleh/tidak.
 * Jendela geser: maksimal LIMIT_HOUR per jam, LIMIT_DAY per hari.
 */
export async function reserveBookingSlot(ip: string): Promise<RateResult> {
  return withLock(async () => {
    const now = Date.now();
    const store = await read();
    // buang entri lebih tua dari 1 hari + IP kosong
    for (const key of Object.keys(store)) {
      store[key] = (store[key] ?? []).filter((t) => now - t < DAY);
      if (!store[key].length) delete store[key];
    }
    const hits = store[ip] ?? [];
    const lastHour = hits.filter((t) => now - t < HOUR);
    const dayCount = hits.length;

    if (lastHour.length >= LIMIT_HOUR || dayCount >= LIMIT_DAY) {
      await write(store);
      const oldestInWindow = lastHour.length >= LIMIT_HOUR ? lastHour[0] : hits[0];
      const waitMs = Math.max(1, oldestInWindow + HOUR - now);
      return {
        allowed: false,
        hourCount: lastHour.length,
        dayCount,
        retryMinutes: Math.ceil(waitMs / 60000),
        limitHour: LIMIT_HOUR,
        limitDay: LIMIT_DAY,
      };
    }

    store[ip] = [...hits, now];
    await write(store);
    return {
      allowed: true,
      hourCount: lastHour.length + 1,
      dayCount: dayCount + 1,
      retryMinutes: 0,
      limitHour: LIMIT_HOUR,
      limitDay: LIMIT_DAY,
    };
  });
}

/** Kembalikan jatah kalau booking-nya sendiri gagal (mis. slot bentrok). */
export async function releaseBookingSlot(ip: string): Promise<void> {
  return withLock(async () => {
    const store = await read();
    const hits = store[ip] ?? [];
    if (!hits.length) return;
    hits.pop();
    if (hits.length) store[ip] = hits;
    else delete store[ip];
    await write(store);
  });
}
