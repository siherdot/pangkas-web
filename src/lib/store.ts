import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  activeServices,
  readSettings,
  scheduleFor,
  type Settings,
} from "./settings";

export type BookingStatus = "pending" | "confirmed" | "done" | "cancelled";

export type Booking = {
  id: string;
  code: string;
  name: string;
  phone: string;
  serviceId: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: BookingStatus;
  note?: string;
  createdAt: string;
  /** salinan nama/harga saat booking dibuat, supaya riwayat tidak berubah */
  serviceName?: string;
  servicePrice?: number;
  barberName?: string;
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "bookings.json");

let queue: Promise<unknown> = Promise.resolve();

type Db = { bookings: Booking[] };

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Db;
    if (!Array.isArray(parsed.bookings)) return { bookings: [] };
    return parsed;
  } catch {
    return { bookings: [] };
  }
}

async function writeDb(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

export function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeOf(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Semua slot mulai yang mungkin untuk satu tanggal, sesuai jam buka hari itu. */
export function slotStarts(date: string, settings: Settings) {
  const { open, close } = scheduleFor(date, settings.shop.schedule);
  const step = settings.shop.slotStep || 30;
  const out: string[] = [];
  for (let m = open * 60; m < close * 60; m += step) out.push(timeOf(m));
  return out;
}

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number) {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

/** Menit sejak tengah malam, waktu Jakarta. */
function nowMinutesJakarta() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = parts.split(":").map(Number);
  return h * 60 + m;
}

export async function availability(date: string, serviceId: string) {
  const settings = await readSettings();
  const service = settings.services.find((s) => s.id === serviceId);
  const dur = service?.duration ?? 30;
  const { close } = scheduleFor(date, settings.shop.schedule);
  const db = await readDb();
  const today = todayISO();
  const now = nowMinutesJakarta();
  const pastDate = date < today;
  const active = db.bookings.filter(
    (b) => b.date === date && b.status !== "cancelled",
  );
  const result: Record<string, Record<string, boolean>> = {};
  for (const barber of settings.barbers.filter((b) => b.active !== false)) {
    result[barber.id] = {};
    for (const slot of slotStarts(date, settings)) {
      const start = minutesOf(slot);
      // tanggal sudah lewat, jam sudah lewat hari ini, atau lewat jam tutup
      if (pastDate || start + dur > close * 60 || (date === today && start <= now)) {
        result[barber.id][slot] = false;
        continue;
      }
      const clash = active.some(
        (b) =>
          b.barberId === barber.id &&
          overlaps(
            start,
            dur,
            minutesOf(b.time),
            settings.services.find((s) => s.id === b.serviceId)?.duration ?? 30,
          ),
      );
      result[barber.id][slot] = !clash;
    }
  }
  return result;
}

export type CreateBookingInput = {
  name: string;
  phone: string;
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
  note?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const today = todayISO();
  if (
    input.date < today ||
    (input.date === today && minutesOf(input.time) <= nowMinutesJakarta())
  ) {
    throw new Error("SLOT_PAST");
  }
  const settings = await readSettings();
  const service = settings.services.find(
    (s) => s.id === input.serviceId && s.active !== false,
  );
  const barber = settings.barbers.find(
    (b) => b.id === input.barberId && b.active !== false,
  );
  if (!service) throw new Error("SERVICE_UNKNOWN");
  if (!barber) throw new Error("BARBER_UNKNOWN");

  return withLock(async () => {
    const db = await readDb();
    const av = await availability(input.date, input.serviceId);
    if (!av[input.barberId] || av[input.barberId][input.time] !== true) {
      throw new Error("SLOT_TAKEN");
    }
    const year = input.date.slice(0, 4);
    const seq = db.bookings.filter((b) => b.date.startsWith(year)).length + 1;
    const code = `HSS-${year}-${String(seq).padStart(4, "0")}`;
    const booking: Booking = {
      id: randomUUID(),
      code,
      name: input.name.trim(),
      phone: input.phone.trim(),
      serviceId: input.serviceId,
      barberId: input.barberId,
      date: input.date,
      time: input.time,
      status: "pending",
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
      serviceName: service.name,
      servicePrice: service.price,
      barberName: barber.name,
    };
    db.bookings.push(booking);
    await writeDb(db);
    return booking;
  });
}

export async function listBookings(filter?: { date?: string; q?: string }) {
  const db = await readDb();
  let rows = db.bookings
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (filter?.date) rows = rows.filter((b) => b.date === filter.date);
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.phone.includes(q),
    );
  }
  return rows;
}

const VALID: BookingStatus[] = ["pending", "confirmed", "done", "cancelled"];

export async function setStatus(id: string, status: BookingStatus) {
  if (!VALID.includes(status)) throw new Error("STATUS_INVALID");
  return withLock(async () => {
    const db = await readDb();
    const row = db.bookings.find((b) => b.id === id);
    if (!row) throw new Error("NOT_FOUND");
    row.status = status;
    await writeDb(db);
    return row;
  });
}

export type QueueInfo = {
  ahead: number;
  position: number;
  startEstimate: string;
  sameBarber: number;
};

/** Posisi antrian satu booking: berapa orang sebelumnya & perkiraan jam mulai. */
export async function queueInfo(bookingId: string): Promise<QueueInfo | null> {
  const db = await readDb();
  const target = db.bookings.find((b) => b.id === bookingId);
  if (!target) return null;
  const settings = await readSettings();
  const now = nowMinutesJakarta();
  const today = todayISO();

  const sameBarber = db.bookings.filter(
    (b) =>
      b.date === target.date &&
      b.barberId === target.barberId &&
      b.status !== "cancelled",
  );
  const aheadRows = sameBarber.filter((b) => {
    if (b.id === target.id) return false;
    if (b.status === "done") return false;
    if (b.time >= target.time) return false;
    if (target.date === today && minutesOf(b.time) < now - 60) return false;
    return true;
  });

  const durOf = (serviceId: string) =>
    settings.services.find((s) => s.id === serviceId)?.duration ?? 30;
  const aheadMinutes = aheadRows.reduce((sum, b) => sum + durOf(b.serviceId), 0);
  const base =
    target.date === today
      ? Math.max(minutesOf(target.time), now)
      : minutesOf(target.time);
  const startEstimate = timeOf(base + aheadMinutes);

  return {
    ahead: aheadRows.length,
    position: aheadRows.length + 1,
    startEstimate,
    sameBarber: sameBarber.length,
  };
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type DecoratedBooking = Booking & {
  serviceDuration: number;
};

/** Lengkapi nama/harga: pakai salinan saat booking, kalau tidak ada pakai katalog. */
export function decorate(rows: Booking[], settings: Settings): DecoratedBooking[] {
  return rows.map((b) => {
    const svc = settings.services.find((s) => s.id === b.serviceId);
    const brb = settings.barbers.find((x) => x.id === b.barberId);
    return {
      ...b,
      serviceName: b.serviceName ?? svc?.name ?? b.serviceId,
      servicePrice: b.servicePrice ?? svc?.price ?? 0,
      serviceDuration: svc?.duration ?? 30,
      barberName: b.barberName ?? brb?.name ?? b.barberId,
    };
  });
}

export function summary(rows: DecoratedBooking[]) {
  const active = rows.filter((b) => b.status !== "cancelled");
  const revenue = rows
    .filter((b) => b.status === "done")
    .reduce((sum, b) => sum + (b.servicePrice ?? 0), 0);
  return {
    total: active.length,
    pending: rows.filter((b) => b.status === "pending").length,
    confirmed: rows.filter((b) => b.status === "confirmed").length,
    done: rows.filter((b) => b.status === "done").length,
    cancelled: rows.filter((b) => b.status === "cancelled").length,
    revenue,
  };
}

export { activeServices };
