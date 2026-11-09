"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Barber, DaySchedule, Service } from "@/lib/shared";
import { scheduleFor } from "@/lib/shared";
import { waConfirmation } from "@/lib/message";

type QueueInfo = {
  total: number;
  position: number;
  estimate: string;
  pastClose?: boolean;
};

type Snapshot = {
  total: number;
  nextPosition: number;
  nextEstimate: string;
  open: string;
  close: string;
  past: boolean;
  closed: boolean;
};

type Props = {
  services: Service[];
  barbers: Barber[];
  schedule: Record<string, DaySchedule>;
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
    year: "numeric",
  });
}

export default function BookingForm({
  services,
  barbers,
  schedule,
  whatsapp,
  shopName,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  const [pax, setPax] = useState(1);
  const [note, setNote] = useState("");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{
    code: string;
    queue: QueueInfo | null;
    time: string;
  } | null>(null);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );
  const barberName = barbers.find((b) => b.id === barberId)?.name ?? "—";

  const loadQueue = useCallback(async () => {
    if (!date || !barberId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/queue?date=${date}&barber=${encodeURIComponent(barberId)}`,
        { cache: "no-store" },
      );
      if (res.ok) setSnap((await res.json()) as Snapshot);
    } finally {
      setLoading(false);
    }
  }, [date, barberId]);

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
    void loadQueue();
  }, [loadQueue]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, serviceId, barberId, date, pax, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Gagal membuat booking. Coba lagi.");
        void loadQueue();
        return;
      }
      const q = (data.queue as QueueInfo) ?? null;
      setDone({ code: data.code, queue: q, time: q?.estimate ?? "" });
      void loadQueue();
    } finally {
      setLoading(false);
    }
  }

  const waLink = done
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        waConfirmation({
          shopName,
          code: done.code,
          name,
          serviceName: service?.name ?? "—",
          barberName,
          dateLabel: prettyDate(date),
          time: done.time,
          priceLabel: rupiah((service?.price ?? 0) * pax),
          pax,
          note,
        }),
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
          Simpan kode ini. Datang 5 menit sebelum perkiraan jam di bawah,
          tunjukkan kode ke barber.
        </p>
        <dl className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink/50">Nama</dt>
            <dd className="font-semibold">{name}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Layanan</dt>
            <dd className="font-semibold">
              {service?.name}
              {pax > 1 ? ` · ${pax} orang` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">Barber</dt>
            <dd className="font-semibold">{barberName}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Tanggal</dt>
            <dd className="font-semibold">{prettyDate(date)}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Perkiraan jam dilayani</dt>
            <dd className="font-semibold">± {done.time} WIB</dd>
          </div>
          <div>
            <dt className="text-ink/50">Bayar di tempat</dt>
            <dd className="font-semibold">
              {rupiah((service?.price ?? 0) * pax)}
              {pax > 1 ? ` (${pax} × ${rupiah(service?.price ?? 0)})` : ""}
            </dd>
          </div>
          {note.trim() && (
            <div className="sm:col-span-2">
              <dt className="text-ink/50">Catatan</dt>
              <dd className="font-semibold">{note.trim()}</dd>
            </div>
          )}
        </dl>

        {done.queue && (
          <div className="mt-4 rounded-2xl border border-brass/40 bg-brass/10 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
              Antrian {barberName} hari itu
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <p className="display text-4xl">{done.queue.total} orang</p>
              <p className="text-sm text-ink/60">
                Kamu{pax > 1 ? ` (${pax} orang)` : ""} masuk urutan ke-
                {done.queue.position} dari {done.queue.total} orang di {barberName}.
              </p>
            </div>
            <p className="mt-2 text-sm text-ink/60">
              Perkiraan jam dilayani <span className="font-semibold text-ink">± {done.time} WIB</span>
              {" "}(hitungan 30 menit per orang).
            </p>
            {done.queue.pastClose && (
              <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">
                Antrean hari itu sudah padat dan melewati jam tutup. Konfirmasi
                ke barber lewat WhatsApp — kemungkinan dilayani di luar jam
                normal atau dijadwalkan ulang.
              </p>
            )}
          </div>
        )}

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
              setName("");
              setPhone("");
              setNote("");
              void loadQueue();
            }}
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-semibold transition hover:border-ink/40"
          >
            Booking lagi
          </button>
        </div>
      </div>
    );
  }

  const warning = snap?.past
    ? "Tanggal sudah lewat — pilih tanggal lain."
    : snap?.closed
      ? "Sudah lewat jam tutup hari ini — pilih tanggal berikutnya."
      : "";

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
        <label className="block text-sm">
          <span className="font-medium text-ink/70">Jumlah orang</span>
          <select
            value={pax}
            onChange={(e) => setPax(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-3 outline-none focus:border-brass"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} orang
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-ink/70">Tanggal kedatangan</span>
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

      <div className="mt-5 rounded-2xl bg-cream p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink/70">
            Antrian {barberName} · {date ? prettyDate(date) : "pilih tanggal"}
          </span>
          <span className="text-xs text-ink/40">
            {loading
              ? "memuat antrian…"
              : snap
                ? `buka ${snap.open}–${snap.close} · 30 menit/orang`
                : ""}
          </span>
        </div>
        {snap && (
          <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-1">
            <p className="display text-3xl">{snap.total} orang</p>
            <p className="text-sm text-ink/60">
              Kalau kamu booking sekarang:{" "}
              <span className="font-semibold text-ink">
                urutan ke-{snap.nextPosition}
              </span>
              , perkiraan dilayani{" "}
              <span className="font-semibold text-ink">
                ± {snap.nextEstimate} WIB
              </span>
            </p>
          </div>
        )}
        {warning && (
          <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {warning}
          </p>
        )}
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
            {rupiah((service?.price ?? 0) * pax)}
          </span>
          {pax > 1 && (
            <span className="block text-xs text-ink/45">
              {pax} orang × {rupiah(service?.price ?? 0)}
            </span>
          )}
        </p>
        <button
          type="submit"
          disabled={loading || Boolean(warning)}
          className="rounded-full bg-brass px-7 py-3 text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-brass-soft disabled:opacity-60"
        >
          {loading ? "Memproses…" : "Buat Booking"}
        </button>
      </div>
      <p className="mt-3 text-xs text-ink/40">
        Jam buka {date ? scheduleFor(date, schedule).label : "—"} WIB. Tidak perlu
        pilih jam — sistem menyusun antrian dan memperkirakan jam dilayani.
      </p>
    </form>
  );
}
