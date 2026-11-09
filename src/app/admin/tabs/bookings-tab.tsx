"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/shared";

export type Row = {
  id: string;
  code: string;
  name: string;
  phone: string;
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "done" | "cancelled";
  note?: string;
  createdAt: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  barberName: string;
};

const STATUS_LABEL: Record<Row["status"], string> = {
  pending: "Baru",
  confirmed: "Terkonfirmasi",
  done: "Selesai",
  cancelled: "Batal",
};

const STATUS_STYLE: Record<Row["status"], string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200 line-through",
};

function prettyDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function BookingsTab({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [allDates, setAllDates] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (!allDates && date) params.set("date", date);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/bookings?${params}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("gagal");
      setRows((await res.json()) as Row[]);
    } catch {
      setError("Gagal memuat data. Coba refresh.");
    } finally {
      setLoading(false);
    }
  }, [date, q, allDates, router]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const stats = useMemo(() => {
    const revenue = rows
      .filter((r) => r.status === "done")
      .reduce((s, r) => s + r.servicePrice, 0);
    return {
      total: rows.filter((r) => r.status !== "cancelled").length,
      pending: rows.filter((r) => r.status === "pending").length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      done: rows.filter((r) => r.status === "done").length,
      revenue,
    };
  }, [rows]);

  const byBarber = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.status === "cancelled") continue;
      map.set(r.barberName, (map.get(r.barberName) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  async function update(id: string, status: Row["status"]) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  const nextUp = rows
    .filter((r) => r.status === "confirmed" || r.status === "pending")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink/40">
            Tanggal
          </span>
          <input
            type="date"
            value={date}
            disabled={allDates}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-brass disabled:opacity-40"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink/60">
          <input
            type="checkbox"
            checked={allDates}
            onChange={(e) => setAllDates(e.target.checked)}
            className="h-4 w-4 accent-brass"
          />
          Semua tanggal
        </label>
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink/40">
            Cari
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nama, kode booking, atau nomor HP"
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-brass"
          />
        </label>
        <button
          onClick={() => void load()}
          className="rounded-xl border border-ink/15 bg-white px-4 py-2 text-sm font-semibold hover:border-ink/40"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Booking aktif", String(stats.total), `${stats.pending} baru · ${stats.confirmed} konfirmasi`],
          ["Selesai", String(stats.done), "sudah dilayani"],
          ["Pendapatan", rupiah(stats.revenue), "dari booking selesai"],
          [
            "Barber tersibuk",
            byBarber[0]?.[0] ?? "—",
            byBarber[0] ? `${byBarber[0][1]} booking` : "belum ada",
          ],
        ].map(([title, value, sub]) => (
          <div key={title} className="rounded-2xl border border-ink/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
              {title}
            </p>
            <p className="display mt-2 text-4xl">{value}</p>
            <p className="mt-1 text-xs text-ink/45">{sub}</p>
          </div>
        ))}
      </div>

      {nextUp && (
        <div className="mt-4 rounded-2xl border border-brass/40 bg-brass/10 p-4 text-sm">
          <span className="font-bold">Berikutnya:</span> {nextUp.name} —{" "}
          {nextUp.serviceName}, {prettyDate(nextUp.date)} {nextUp.time} bersama{" "}
          {nextUp.barberName} ({nextUp.code})
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wider text-ink/45">
              <tr>
                <th className="px-4 py-3">Jadwal</th>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Layanan</th>
                <th className="px-4 py-3">Barber</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/40">
                    Memuat…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/40">
                    Belum ada booking untuk filter ini.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-ink/5 align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold">{r.time}</span>
                      <span className="block text-xs text-ink/45">
                        {prettyDate(r.date)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {r.code}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{r.name}</span>
                      <a
                        href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-moss underline-offset-2 hover:underline"
                      >
                        {r.phone}
                      </a>
                      {r.note && (
                        <span className="mt-1 block text-xs text-ink/45">
                          “{r.note}”
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.serviceName}
                      <span className="block text-xs text-ink/45">
                        {rupiah(r.servicePrice)} · {r.serviceDuration} mnt
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.barberName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {r.status === "pending" && (
                          <button
                            onClick={() => void update(r.id, "confirmed")}
                            className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Konfirmasi
                          </button>
                        )}
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <>
                            <button
                              onClick={() => void update(r.id, "done")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Selesai
                            </button>
                            <button
                              onClick={() => void update(r.id, "cancelled")}
                              className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold text-ink/60 hover:border-red-300 hover:text-red-600"
                            >
                              Batal
                            </button>
                          </>
                        )}
                        {(r.status === "done" || r.status === "cancelled") && (
                          <span className="text-xs text-ink/30">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
