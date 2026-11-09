"use client";

import { slugify, type Barber } from "@/lib/shared";

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass";

export default function BarbersTab({
  barbers,
  onChange,
}: {
  barbers: Barber[];
  onChange: (next: Barber[]) => void;
}) {
  function edit(i: number, patch: Partial<Barber>) {
    onChange(barbers.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function add() {
    onChange([
      ...barbers,
      {
        id: `barber-${barbers.length + 1}`,
        name: "",
        role: "",
        initials: "",
        years: 1,
        active: true,
      },
    ]);
  }

  function remove(i: number) {
    if (barbers.length <= 1) return;
    if (!confirm(`Hapus barber "${barbers[i].name || "tanpa nama"}"?`)) return;
    onChange(barbers.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl">Tim barber</h2>
          <p className="mt-1 text-sm text-ink/55">
            Barber nonaktif tidak muncul di pilihan booking, tapi namanya tetap
            tampil di riwayat booking lama.
          </p>
        </div>
        <button
          onClick={add}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream hover:bg-ink/85"
        >
          + Tambah barber
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {barbers.map((b, i) => (
          <div key={i} className="rounded-2xl border border-ink/10 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Nama
                </span>
                <input
                  value={b.name}
                  onChange={(e) => edit(i, { name: e.target.value })}
                  placeholder="Rio"
                  className={inputCls + " mt-1"}
                />
              </label>
              <label>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Spesialisasi
                </span>
                <input
                  value={b.role}
                  onChange={(e) => edit(i, { role: e.target.value })}
                  placeholder="Fade & undercut"
                  className={inputCls + " mt-1"}
                />
              </label>
              <label>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Inisial (maks 3)
                </span>
                <input
                  value={b.initials}
                  maxLength={3}
                  onChange={(e) =>
                    edit(i, { initials: e.target.value.toUpperCase() })
                  }
                  placeholder="RI"
                  className={inputCls + " mt-1 uppercase"}
                />
              </label>
              <label>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Pengalaman (tahun)
                </span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={b.years}
                  onChange={(e) => edit(i, { years: Number(e.target.value) })}
                  className={inputCls + " mt-1"}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-3 text-sm text-ink/60">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={b.active !== false}
                    onChange={(e) => edit(i, { active: e.target.checked })}
                    className="h-4 w-4 accent-brass"
                  />
                  Aktif
                </label>
                <span className="text-xs text-ink/35">
                  ID: <code>{slugify(b.id || b.name) || "—"}</code>
                </span>
              </div>
              <button
                onClick={() => remove(i)}
                className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-red-300 hover:text-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
