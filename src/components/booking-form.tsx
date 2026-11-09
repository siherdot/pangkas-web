"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Barber, Service } from "@/lib/catalog";

type Availability = Record<string, Record<string, boolean>>;

type Props = {
  services: Service[];
  barbers: Barber[];
  whatsapp: string;
  shopName: string;
};

function rupiah(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

function prettyDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function BookingForm({
  services,
  barbers,
  whatsapp,
  shopName,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [av, setAv] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const loadSlots = useCallback(async () => {
    if (!date || !serviceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/slots?date=${date}&service=${encodeURIComponent(serviceId)}`,
        { cache: "no-store" },
      );
      if (res.ok) setAv((await res.json()) as Availability);
    } finally {
      setLoading(false);
    }
  }, [date, serviceId]);

  useEffect(() => {
    const t = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    setToday(t);
    setDate((d) => d || t);
  }, []);

  useEffect(() => {
    setTime("");
    void loadSlots();
  }, [loadSlots]);

  const slots = useMemo(() => {
    if (!av || !av[barberId]) return [];
    return Object.entries(av[barberId]).map(([t, free]) => ({ t, free }));
  }, [av, barberId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!time) {
      setError("Pilih jam kedatangan dulu.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, serviceId, barberId, date, time, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "SLOT_TAKEN") {
          setError("Slot itu baru saja diambil orang lain. Pilih jam lain.");
          setTime("");
          void loadSlots();
        } else {
          setError(data?.message || "Gagal membuat booking. Coba lagi.");
        }
        return;
      }
      setDone({ code: data.code });
      void loadSlots();
    } finally {
      setLoading(false);
    }
  }

  const barberName = barbers.find((b) => b.id === barberId)?.name ?? "—";

  const waLink = done
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Halo ${shopName}, saya mau konfirmasi booking ${done.code} atas nama ${name} — ${service?.name ?? ""}, ${prettyDate(date)} jam ${time}.`,
      )}`
    : "#booking";

  if (done) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brass">
          Booking berhasil
        </p>
        <h3 className="display mt-3 text-5xl">Kode kamu {done.code}</h3>
        <p className="mt-4 text-sm text-ink/70">
          Simpan kode ini. Datang 5 menit lebih awal, tunjukkan kode ke barber —
          kursi langsung siap.
        </p>
        <dl className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink/50">Nama</dt>
            <dd className="font-semibold">{name}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Layanan</dt>
            <dd className="font-semibold">{service?.name}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Barber</dt>
            <dd className="font-semibold">{barberName}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Jadwal</dt>
            <dd className="font-semibold">
              {prettyDate(date)} · {time}
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">Durasi</dt>
            <dd className="font-semibold">± {service?.duration} menit</dd>
          </div>
          <div>
            <dt className="text-ink/50">Bayar di tempat</dt>
            <dd className="font-semibold">{rupiah(service?.price ?? 0)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-moss px-6 py-3 text-sm font-semibold text-cream transition hover:bg-moss/90"
          >
            Konfirmasi via WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setTime("");
              setName("");
              setPhone("");
              setNote("");
            }}
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold transition hover:border-ink/40"
          >
            Booking lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink/70">Nama kamu</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap"
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink/70">Nomor WhatsApp</span>
          <input
            required
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xx"
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink/70">Layanan</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {rupiah(s.price)} ({s.duration} mnt)
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink/70">Barber</span>
          <select
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.role}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-ink/70">Tanggal</span>
          <input
            type="date"
            required
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink/70">
            Pilih jam kedatangan
          </span>
          <span className="text-xs text-ink/40">
            {loading ? "memuat slot…" : `slot kosong untuk ${barberName}`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {slots.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-ink/40">
              Memuat slot…
            </p>
          )}
          {slots.map(({ t, free }) => (
            <button
              key={t}
              type="button"
              disabled={!free}
              onClick={() => setTime(t)}
              className={
                "rounded-xl border px-2 py-2 text-sm font-semibold transition " +
                (time === t
                  ? "border-ink bg-ink text-cream"
                  : free
                    ? "border-ink/15 bg-cream/60 hover:border-brass"
                    : "cursor-not-allowed border-transparent bg-ink/5 text-ink/25 line-through")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-ink/70">Catatan (opsional)</span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: mau fade tipis di samping"
          className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink/60">
          Total bayar di tempat{" "}
          <span className="font-bold text-ink">
            {rupiah(service?.price ?? 0)}
          </span>
        </p>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-brass px-7 py-3 text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-brass-soft disabled:opacity-60"
        >
          {loading ? "Memproses…" : "Buat Booking"}
        </button>
      </div>
    </form>
  );
}
