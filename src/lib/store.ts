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
  /** jumlah orang yang dicukur dalam satu booking (default 1) */
  pax?: number;
  note?: string;
  ip?: string;
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

/** Nomor WA disamakan ke format 62… supaya 0812 / +62812 / 62812 dianggap sama. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

/** Booking yang masih menempati antrian: baru atau terkonfirmasi. */
export function isActive(status: BookingStatus) {
  return status === "pending" || status === "confirmed";
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

/** Durasi cadangan kalau layanan tidak ditemukan (menit). */
export const ESTIMATE_MIN = Number(process.env.BOOKING_ESTIMATE_MINUTES || 30);

/** Menit yang dipakai satu booking = jumlah orang × durasi layanan. */
function bookingMinutes(
  b: { serviceId: string; pax?: number },
  settings: Settings,
) {
  const dur =
    settings.services.find((s) => s.id === b.serviceId)?.duration ?? ESTIMATE_MIN;
  return Math.max(1, b.pax ?? 1) * dur;
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

export type QueueSnapshot = {
  date: string;
  barberId: string;
  /** jumlah booking aktif barber itu pada tanggal itu */
  total: number;
  /** urutan kalau ikut booking sekarang (1 = langsung dilayani) */
  nextPosition: number;
  /** perkiraan jam dilayani untuk posisi berikutnya */
  nextEstimate: string;
  open: string;
  close: string;
  /** tanggal sudah lewat */
  past: boolean;
  /** hari ini tapi sudah lewat jam tutup */
  closed: boolean;
};

/**
 * Kondisi antrian satu barber pada satu tanggal.
 * Tanpa pemilihan jam: urutan = booking aktif yang sudah ada, estimasi 30 menit per orang
 * dihitung dari jam buka (atau jam sekarang kalau hari ini).
 */
export async function queueSnapshot(
  date: string,
  barberId: string,
): Promise<QueueSnapshot> {
  const settings = await readSettings();
  const { open, close } = scheduleFor(date, settings.shop.schedule);
  const today = todayISO();
  const now = nowMinutesJakarta();
  const db = await readDb();
  const rows = db.bookings.filter(
    (b) =>
      b.date === date && b.barberId === barberId && isActive(b.status),
  );
  const people = rows.reduce((sum, b) => sum + (b.pax ?? 1), 0);
  const busyMinutes = rows.reduce((sum, b) => sum + bookingMinutes(b, settings), 0);
  const past = date < today;
  const closed = date === today && now >= close * 60;
  const base = date === today ? Math.max(open * 60, now) : open * 60;
  return {
    date,
    barberId,
    total: people,
    nextPosition: people + 1,
    nextEstimate: timeOf(base + busyMinutes),
    open: timeOf(open * 60),
    close: timeOf(close * 60),
    past,
    closed,
  };
}

export type CreateBookingInput = {
  name: string;
  phone: string;
  serviceId: string;
  barberId: string;
  date: string;
  pax?: number;
  note?: string;
  ip?: string;
};

export async function createBooking(input: CreateBookingInput) {
  const today = todayISO();
  if (input.date < today) throw new Error("SLOT_PAST");
  const snap = await queueSnapshot(input.date, input.barberId);
  if (snap.closed) throw new Error("SHOP_CLOSED");

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
    // satu nomor WhatsApp hanya boleh punya satu booking aktif per tanggal
    const phone = normalizePhone(input.phone);
    const duplicate = db.bookings.find(
      (b) =>
        b.date === input.date &&
        isActive(b.status) &&
        normalizePhone(b.phone) === phone,
    );
    if (duplicate) throw new Error(`DUPLICATE|${duplicate.code}`);
    // hitung ulang di dalam lock supaya dua orang tidak dapat nomor antrian sama
    const sameDay = db.bookings.filter(
      (b) =>
        b.date === input.date &&
        b.barberId === input.barberId &&
        isActive(b.status),
    );
    const { open, close } = scheduleFor(input.date, settings.shop.schedule);
    const base =
      input.date === today ? Math.max(open * 60, nowMinutesJakarta()) : open * 60;
    const pax = Math.min(5, Math.max(1, Math.round(Number(input.pax) || 1)));
    const peopleAhead = sameDay.reduce((sum, b) => sum + (b.pax ?? 1), 0);
    const minutesAhead = sameDay.reduce(
      (sum, b) => sum + bookingMinutes(b, settings),
      0,
    );
    const estimateMinutes = base + minutesAhead;
    const ownMinutes = pax * (service.duration || ESTIMATE_MIN);
    const estimated = timeOf(estimateMinutes);
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
      time: estimated,
      status: "pending",
      pax,
      note: input.note?.trim() || undefined,
      ip: input.ip,
      createdAt: new Date().toISOString(),
      serviceName: service.name,
      servicePrice: service.price,
      barberName: barber.name,
    };
    db.bookings.push(booking);
    await writeDb(db);
    return {
      booking,
      queue: {
        total: peopleAhead + pax,
        position: peopleAhead + 1,
        estimate: estimated,
        pastClose: estimateMinutes + ownMinutes > close * 60,
      },
    };
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
  const active = rows.filter((b) => isActive(b.status));
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
