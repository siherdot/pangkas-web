/** Tipe + helper murni (tanpa node:fs) — aman diimpor komponen client. */
export type Service = {
  id: string;
  name: string;
  price: number;
  duration: number; // menit
  desc: string;
  popular?: boolean;
  active?: boolean;
};

export type Barber = {
  id: string;
  name: string;
  role: string;
  initials: string;
  years: number;
  active?: boolean;
};

export type DaySchedule = { open: number; close: number };

export type Shop = {
  name: string;
  tagline: string;
  city: string;
  address: string;
  whatsapp: string;
  instagram: string;
  heroHeadline: string;
  heroSubline: string;
  hoursNote: string;
  slotStep: number;
  schedule: Record<string, DaySchedule>;
};

export type Settings = {
  shop: Shop;
  services: Service[];
  barbers: Barber[];
};

export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export function rupiah(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

export function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function scheduleFor(dateISO: string, schedule: Record<string, DaySchedule>) {
  const weekday = new Date(dateISO + "T12:00:00+07:00").getDay();
  const s = schedule[String(weekday)] ?? { open: 10, close: 21 };
  return {
    ...s,
    label: `${String(s.open).padStart(2, "0")}.00–${String(s.close).padStart(2, "0")}.00`,
  };
}

export function lastBookingFor(dateISO: string, schedule: Record<string, DaySchedule>) {
  const { close } = scheduleFor(dateISO, schedule);
  return `${String(close - 1).padStart(2, "0")}.30`;
}

export function activeServices(s: Settings) {
  return s.services.filter((x) => x.active !== false);
}
