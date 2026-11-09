import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DAY_NAMES,
  slugify,
  type Barber,
  type DaySchedule,
  type Service,
  type Settings,
} from "./shared";

export * from "./shared";

/** ---------- default (dipakai saat settings.json belum ada) ---------- */
export const DEFAULT_SETTINGS: Settings = {
  shop: {
    name: "Pangkas",
    tagline: "Hair Style Studio",
    city: "Pangkalan Berandan",
    address:
      "Jalan Alur Dua, Rel Tangkah Lagan, Pangkalan Berandan, Sumatera Utara, Indonesia",
    whatsapp: process.env.SHOP_WHATSAPP || "6281397339072",
    instagram: "@hairstylestudioo_",
    heroHeadline: "Potong Rapi Tanpa Antre Lama",
    heroSubline:
      "Pilih layanan, pilih barber favorit, tentukan jamnya dari HP. Pas datang, kursi sudah siap — tidak perlu menunggu giliran di tempat.",
    hoursNote: "Sen–Kam & Sab 10.00–21.00 · Jum & Min 14.00–22.00",
    slotStep: 30,
    schedule: {
      "0": { open: 14, close: 22 },
      "1": { open: 10, close: 21 },
      "2": { open: 10, close: 21 },
      "3": { open: 10, close: 21 },
      "4": { open: 10, close: 21 },
      "5": { open: 14, close: 22 },
      "6": { open: 10, close: 21 },
    },
  },
  services: [
    {
      id: "cukur-biasa",
      name: "Cukur Biasa",
      price: 25000,
      duration: 30,
      desc: "Potong rapi sesuai selera, cuci rambut, dan finishing pomade.",
      active: true,
    },
    {
      id: "cukur-pompadour",
      name: "Cukur + Pompadour",
      price: 35000,
      duration: 45,
      desc: "Potong presisi dengan styling pompadour atau side part.",
      popular: true,
      active: true,
    },
    {
      id: "cukur-jenggot",
      name: "Cukur + Rapikan Jenggot",
      price: 45000,
      duration: 45,
      desc: "Potong rambut plus shaping jenggot dengan handuk hangat.",
      active: true,
    },
    {
      id: "creambath",
      name: "Creambath",
      price: 55000,
      duration: 45,
      desc: "Perawatan kulit kepala, pijat ringan, dan hair tonic.",
      active: true,
    },
    {
      id: "kids",
      name: "Cukur Anak",
      price: 20000,
      duration: 30,
      desc: "Khusus usia di bawah 12 tahun. Sabar, cepat, tidak drama.",
      active: true,
    },
  ],
  barbers: [
    {
      id: "rio",
      name: "Rio",
      role: "Fade & undercut",
      initials: "RI",
      years: 8,
      active: true,
    },
    {
      id: "damar",
      name: "Damar",
      role: "Pompadour klasik",
      initials: "DA",
      years: 6,
      active: true,
    },
    {
      id: "yoga",
      name: "Yoga",
      role: "Beard shaping",
      initials: "YO",
      years: 4,
      active: true,
    },
  ],
};

/** ---------- penyimpanan ---------- */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "settings.json");

let lock: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
}

function normalize(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const r = raw as Partial<Settings>;
  const shop = { ...d.shop, ...(r.shop ?? {}) };
  shop.schedule = { ...d.shop.schedule, ...(r.shop?.schedule ?? {}) };
  const services =
    Array.isArray(r.services) && r.services.length
      ? r.services.map((s) => ({
          id: String(s?.id ?? ""),
          name: String(s?.name ?? ""),
          price: Number(s?.price) || 0,
          duration: Number(s?.duration) || 30,
          desc: String(s?.desc ?? ""),
          popular: Boolean(s?.popular),
          active: s?.active !== false,
        }))
      : d.services;
  const barbers =
    Array.isArray(r.barbers) && r.barbers.length
      ? r.barbers.map((b) => ({
          id: String(b?.id ?? ""),
          name: String(b?.name ?? ""),
          role: String(b?.role ?? ""),
          initials: String(b?.initials ?? "").slice(0, 3).toUpperCase(),
          years: Number(b?.years) || 0,
          active: b?.active !== false,
        }))
      : d.barbers;
  return {
    shop: { ...shop, slotStep: Number(shop.slotStep) || 30 },
    services,
    barbers,
  };
}

export async function readSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return normalize(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export type ValidationError = { field: string; message: string };

export function validateSettings(input: unknown): {
  ok: boolean;
  errors: ValidationError[];
  value?: Settings;
} {
  const errors: ValidationError[] = [];
  const raw = input as Partial<Settings>;
  if (!raw?.shop) errors.push({ field: "Data toko", message: "Data toko kosong." });
  const shop: Settings["shop"] = { ...DEFAULT_SETTINGS.shop, ...(raw?.shop ?? {}) };

  const text = (v: unknown, field: string, min: number, max: number) => {
    const s = String(v ?? "").trim();
    if (s.length < min) errors.push({ field, message: `${field} wajib diisi.` });
    if (s.length > max) errors.push({ field, message: `${field} terlalu panjang.` });
    return s;
  };

  shop.name = text(shop.name, "Nama website", 2, 60);
  shop.tagline = text(shop.tagline, "Tagline", 0, 60);
  shop.city = text(shop.city, "Kota", 0, 60);
  shop.address = text(shop.address, "Alamat", 0, 300);
  shop.heroHeadline = text(shop.heroHeadline, "Judul hero", 0, 120);
  shop.heroSubline = text(shop.heroSubline, "Subjudul hero", 0, 400);
  shop.hoursNote = text(shop.hoursNote, "Catatan jam", 0, 160);
  shop.instagram = text(shop.instagram, "Instagram", 0, 60);

  const wa = String(shop.whatsapp ?? "").replace(/[\s\-+()]/g, "");
  if (!/^62\d{8,14}$/.test(wa)) {
    errors.push({
      field: "WhatsApp",
      message: "Format WhatsApp: 62… tanpa +/spasi (contoh 6281397339072).",
    });
  }
  shop.whatsapp = wa;

  const step = Number(shop.slotStep);
  if (!Number.isFinite(step) || step < 15 || step > 120) {
    errors.push({ field: "Jarak slot", message: "Jarak slot 15–120 menit." });
  }
  shop.slotStep = step;

  const schedule: Record<string, DaySchedule> = {};
  for (let day = 0; day < 7; day++) {
    const s =
      shop.schedule?.[String(day)] ?? DEFAULT_SETTINGS.shop.schedule[String(day)];
    const open = Number(s.open);
    const close = Number(s.close);
    if (!(open >= 0 && open <= 23) || !(close >= 1 && close <= 24) || close <= open) {
      errors.push({
        field: `Jam ${DAY_NAMES[day]}`,
        message: `Jam ${DAY_NAMES[day]} tidak valid (tutup harus lebih lambat dari buka).`,
      });
    }
    schedule[String(day)] = { open, close };
  }
  shop.schedule = schedule;

  const services: Service[] = [];
  const seenSvc = new Set<string>();
  (Array.isArray(raw?.services) ? raw.services : []).forEach((s, i) => {
    const name = String(s?.name ?? "").trim();
    const id = slugify(String(s?.id || name));
    const price = Math.round(Number(s?.price));
    const duration = Math.round(Number(s?.duration));
    if (!name) errors.push({ field: `Layanan #${i + 1}`, message: "Nama layanan wajib." });
    if (!id) errors.push({ field: `Layanan #${i + 1}`, message: "ID layanan wajib." });
    if (seenSvc.has(id))
      errors.push({ field: `Layanan #${i + 1}`, message: `ID "${id}" dobel.` });
    if (!Number.isFinite(price) || price < 0 || price > 10_000_000) {
      errors.push({ field: `Layanan #${i + 1}`, message: "Harga tidak valid." });
    }
    if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
      errors.push({ field: `Layanan #${i + 1}`, message: "Durasi 5–240 menit." });
    }
    seenSvc.add(id);
    services.push({
      id,
      name,
      price,
      duration,
      desc: String(s?.desc ?? "").trim().slice(0, 240),
      popular: Boolean(s?.popular),
      active: s?.active !== false,
    });
  });
  if (!services.length && !errors.some((e) => e.field.startsWith("Layanan"))) {
    errors.push({ field: "Layanan", message: "Minimal satu layanan." });
  }

  const barbers: Barber[] = [];
  const seenBarber = new Set<string>();
  (Array.isArray(raw?.barbers) ? raw.barbers : []).forEach((b, i) => {
    const name = String(b?.name ?? "").trim();
    const id = slugify(String(b?.id || name));
    if (!name) errors.push({ field: `Barber #${i + 1}`, message: "Nama barber wajib." });
    if (!id) errors.push({ field: `Barber #${i + 1}`, message: "ID barber wajib." });
    if (seenBarber.has(id))
      errors.push({ field: `Barber #${i + 1}`, message: `ID "${id}" dobel.` });
    seenBarber.add(id);
    barbers.push({
      id,
      name,
      role: String(b?.role ?? "").trim().slice(0, 80),
      initials:
        String(b?.initials ?? "").trim().slice(0, 3).toUpperCase() ||
        name.slice(0, 2).toUpperCase(),
      years: Math.max(0, Math.min(60, Math.round(Number(b?.years) || 0))),
      active: b?.active !== false,
    });
  });
  if (!barbers.length && !errors.some((e) => e.field.startsWith("Barber"))) {
    errors.push({ field: "Barber", message: "Minimal satu barber." });
  }
  if (
    services.length &&
    services.every((s) => s.active === false) &&
    !errors.some((e) => e.message.includes("Minimal satu layanan"))
  ) {
    errors.push({ field: "Layanan", message: "Minimal satu layanan aktif." });
  }
  if (
    barbers.length &&
    barbers.every((b) => b.active === false) &&
    !errors.some((e) => e.message.includes("Minimal satu barber"))
  ) {
    errors.push({ field: "Barber", message: "Minimal satu barber aktif." });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], value: { shop, services, barbers } };
}

export async function saveSettings(value: Settings): Promise<Settings> {
  return withLock(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(tmp, FILE);
    return value;
  });
}
