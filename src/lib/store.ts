import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  BARBERS,
  SERVICES,
  SHOP,
  scheduleFor,
  serviceById,
  type Booking,
  type BookingStatus,
} from "./catalog";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "bookings.json");

// antrean sederhana: tulis file satu per satu supaya tidak saling menimpa
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

/** Semua slot mulai yang mungkin untuk satu tanggal (mengikuti jadwal hari itu). */
export function slotStarts(date: string) {
  const { open, close } = scheduleFor(date);
  const out: string[] = [];
  for (let m = open * 60; m < close * 60; m += SHOP.slotStep) out.push(timeOf(m));
  return out;
}

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number) {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

export async function availability(date: string, serviceId: string) {
  const service = serviceById(serviceId);
  const dur = service?.duration ?? 30;
  const { close } = scheduleFor(date);
  const db = await readDb();
  const active = db.bookings.filter(
    (b) => b.date === date && b.status !== "cancelled",
  );
  const result: Record<string, Record<string, boolean>> = {};
  for (const barber of BARBERS) {
    result[barber.id] = {};
    for (const slot of slotStarts(date)) {
      const start = minutesOf(slot);
      if (start + dur > close * 60) {
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
            serviceById(b.serviceId)?.duration ?? 30,
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
  return withLock(async () => {
    const db = await readDb();
    const av = await availability(input.date, input.serviceId);
    if (!av[input.barberId] || av[input.barberId][input.time] !== true) {
      throw new Error("SLOT_TAKEN");
    }
    const year = input.date.slice(0, 4);
    const seq =
      db.bookings.filter((b) => b.date.startsWith(year)).length + 1;
    const code = `PK-${year}-${String(seq).padStart(4, "0")}`;
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
    };
    db.bookings.push(booking);
    await writeDb(db);
    return booking;
  });
}

export async function listBookings(filter?: { date?: string; q?: string }) {
  const db = await readDb();
  let rows = db.bookings.slice().sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  );
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

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function summary(rows: Booking[]) {
  const active = rows.filter((b) => b.status !== "cancelled");
  const revenue = rows
    .filter((b) => b.status === "done")
    .reduce((sum, b) => sum + (serviceById(b.serviceId)?.price ?? 0), 0);
  return {
    total: active.length,
    pending: rows.filter((b) => b.status === "pending").length,
    confirmed: rows.filter((b) => b.status === "confirmed").length,
    done: rows.filter((b) => b.status === "done").length,
    cancelled: rows.filter((b) => b.status === "cancelled").length,
    revenue,
  };
}

export { SERVICES };
