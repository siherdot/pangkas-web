"use client";

import { DAY_NAMES, type Shop } from "@/lib/shared";

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass";

function hourOptions(max: number) {
  return Array.from({ length: max + 1 }, (_, h) => (
    <option key={h} value={h}>
      {String(h).padStart(2, "0")}.00
    </option>
  ));
}

function autoNote(shop: Shop) {
  const group = (days: number[]) =>
    days
      .map((d) => DAY_NAMES[d].slice(0, 3))
      .join("–")
      .replace(/^(\w{3})–(\w{3})$/, "$1–$2");
  const buckets = new Map<string, number[]>();
  for (let d = 1; d <= 6; d++) {
    const s = shop.schedule[String(d)];
    const key = `${s.open}-${s.close}`;
    buckets.set(key, [...(buckets.get(key) ?? []), d]);
  }
  const sunday = shop.schedule["0"];
  const parts: string[] = [];
  for (const [key, days] of buckets) {
    const [open, close] = key.split("-");
    const label = days.length > 2 ? `${group([days[0], days[days.length - 1]])}` : days.map((d) => DAY_NAMES[d].slice(0, 3)).join(" & ");
    parts.push(`${label} ${String(open).padStart(2, "0")}.00–${close}.00`);
  }
  if (sunday) {
    parts.push(
      `Min ${String(sunday.open).padStart(2, "0")}.00–${sunday.close}.00`,
    );
  }
  return parts.join(" · ");
}

export default function ShopTab({
  shop,
  onChange,
}: {
  shop: Shop;
  onChange: (next: Shop) => void;
}) {
  function set<K extends keyof Shop>(key: K, value: Shop[K]) {
    onChange({ ...shop, [key]: value });
  }

  function setDay(day: number, patch: { open?: number; close?: number }) {
    onChange({
      ...shop,
      schedule: {
        ...shop.schedule,
        [String(day)]: { ...shop.schedule[String(day)], ...patch },
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display text-3xl">Info website</h2>
        <p className="mt-1 text-sm text-ink/55">
          Nama, teks hero, kontak, jam buka, dan jarak slot. Semua langsung
          berubah di halaman depan setelah disimpan.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-ink/40">
          Identitas
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-ink/70">Nama website</span>
            <input
              value={shop.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">Tagline</span>
            <input
              value={shop.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">Kota</span>
            <input
              value={shop.city}
              onChange={(e) => set("city", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">Instagram</span>
            <input
              value={shop.instagram}
              onChange={(e) => set("instagram", e.target.value)}
              placeholder="@namatoko"
              className={inputCls + " mt-1"}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-ink/70">Alamat</span>
            <textarea
              rows={2}
              value={shop.address}
              onChange={(e) => set("address", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">
              WhatsApp (format 62…)
            </span>
            <input
              value={shop.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="6281397339072"
              inputMode="numeric"
              className={inputCls + " mt-1"}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">
              Jarak antar slot (menit)
            </span>
            <select
              value={shop.slotStep}
              onChange={(e) => set("slotStep", Number(e.target.value))}
              className={inputCls + " mt-1"}
            >
              {[15, 20, 30, 45, 60].map((s) => (
                <option key={s} value={s}>
                  {s} menit
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-ink/40">
          Teks halaman depan
        </p>
        <div className="mt-3 grid gap-3">
          <label>
            <span className="text-sm font-medium text-ink/70">Judul besar (hero)</span>
            <input
              value={shop.heroHeadline}
              onChange={(e) => set("heroHeadline", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">Kalimat pembuka</span>
            <textarea
              rows={3}
              value={shop.heroSubline}
              onChange={(e) => set("heroSubline", e.target.value)}
              className={inputCls + " mt-1"}
            />
            <span className="mt-1 block text-xs text-ink/40">
              Teks biasa, tanpa HTML. Enter = baris baru.
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/40">
            Jam buka per hari
          </p>
          <button
            onClick={() => set("hoursNote", autoNote(shop))}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:border-ink/40"
          >
            Susun teks jam otomatis
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {DAY_NAMES.map((day, i) => {
            const s = shop.schedule[String(i)] ?? { open: 10, close: 21 };
            return (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-cream/50 px-3 py-2"
              >
                <span className="w-20 text-sm font-semibold">{day}</span>
                <select
                  value={s.open}
                  onChange={(e) => setDay(i, { open: Number(e.target.value) })}
                  className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm"
                >
                  {hourOptions(23)}
                </select>
                <span className="text-sm text-ink/40">sampai</span>
                <select
                  value={s.close}
                  onChange={(e) => setDay(i, { close: Number(e.target.value) })}
                  className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-sm"
                >
                  {hourOptions(24).slice(1)}
                </select>
                <span className="text-xs text-ink/40">
                  ({s.close - s.open} jam)
                </span>
              </div>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-ink/70">
            Teks jam di bagian Info
          </span>
          <input
            value={shop.hoursNote}
            onChange={(e) => set("hoursNote", e.target.value)}
            className={inputCls + " mt-1"}
          />
          <span className="mt-1 block text-xs text-ink/40">
            Tampil di halaman depan: “{shop.hoursNote} WIB.”
          </span>
        </label>
      </div>
    </div>
  );
}
