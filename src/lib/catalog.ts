export type Service = {
  id: string;
  name: string;
  price: number;
  duration: number; // menit
  desc: string;
  popular?: boolean;
};

export type Barber = {
  id: string;
  name: string;
  role: string;
  initials: string;
  years: number;
};

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
};

export const SHOP = {
  name: "Pangkas",
  tagline: "Barbershop",
  city: "Medan",
  address: "Jl. Gatot Subroto No. 88, Medan",
  hours: "10.00–21.00",
  lastBooking: "20.30",
  openHour: 10,
  closeHour: 21,
  slotStep: 30, // menit
  timezone: "Asia/Jakarta",
  whatsapp: process.env.SHOP_WHATSAPP || "6281234567890",
  instagram: "@pangkas.id",
};

export const SERVICES: Service[] = [
  {
    id: "cukur-biasa",
    name: "Cukur Biasa",
    price: 25000,
    duration: 30,
    desc: "Potong rapi sesuai selera, cuci rambut, dan finishing pomade.",
  },
  {
    id: "cukur-pompadour",
    name: "Cukur + Pompadour",
    price: 35000,
    duration: 45,
    desc: "Potong presisi dengan styling pompadour atau side part.",
    popular: true,
  },
  {
    id: "cukur-jenggot",
    name: "Cukur + Rapikan Jenggot",
    price: 45000,
    duration: 45,
    desc: "Potong rambut plus shaping jenggot dengan handuk hangat.",
  },
  {
    id: "creambath",
    name: "Creambath",
    price: 55000,
    duration: 45,
    desc: "Perawatan kulit kepala, pijat ringan, dan hair tonic.",
  },
  {
    id: "kids",
    name: "Cukur Anak",
    price: 20000,
    duration: 30,
    desc: "Khusus usia di bawah 12 tahun. Sabar, cepat, tidak drama.",
  },
];

export const BARBERS: Barber[] = [
  { id: "rio", name: "Rio", role: "Fade & undercut", initials: "RI", years: 8 },
  { id: "damar", name: "Damar", role: "Pompadour klasik", initials: "DA", years: 6 },
  { id: "yoga", name: "Yoga", role: "Beard shaping", initials: "YO", years: 4 },
];

export function serviceById(id: string) {
  return SERVICES.find((s) => s.id === id);
}

export function barberById(id: string) {
  return BARBERS.find((b) => b.id === id);
}

export function rupiah(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}
