"use client";

import { rupiah, slugify, type Service } from "@/lib/shared";

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass";

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

export default function ServicesTab({
  services,
  onChange,
}: {
  services: Service[];
  onChange: (next: Service[]) => void;
}) {
  function edit(i: number, patch: Partial<Service>) {
    onChange(services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function add() {
    onChange([
      ...services,
      {
        id: `layanan-${services.length + 1}`,
        name: "",
        price: 25000,
        duration: 30,
        desc: "",
        active: true,
      },
    ]);
  }

  function remove(i: number) {
    if (services.length <= 1) return;
    if (!confirm(`Hapus layanan "${services[i].name || "tanpa nama"}"?`)) return;
    onChange(services.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= services.length) return;
    const next = services.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl">Layanan &amp; harga</h2>
          <p className="mt-1 text-sm text-ink/55">
            Yang tampil di halaman harga dan jadi pilihan saat booking. Layanan
            nonaktif disembunyikan dari pengunjung, tapi riwayat booking lama
            tetap aman.
          </p>
        </div>
        <button
          onClick={add}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream hover:bg-ink/85"
        >
          + Tambah layanan
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {services.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink/10 bg-white p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <label className="lg:col-span-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Nama
                </span>
                <input
                  value={s.name}
                  onChange={(e) => edit(i, { name: e.target.value })}
                  placeholder="Cukur Biasa"
                  className={inputCls + " mt-1"}
                />
              </label>
              <label className="lg:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Harga (Rp)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={s.price}
                  onChange={(e) => edit(i, { price: Number(e.target.value) })}
                  className={inputCls + " mt-1"}
                />
              </label>
              <label className="lg:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Durasi
                </span>
                <select
                  value={s.duration}
                  onChange={(e) => edit(i, { duration: Number(e.target.value) })}
                  className={inputCls + " mt-1"}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} menit
                    </option>
                  ))}
                </select>
              </label>
              <label className="lg:col-span-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                  Deskripsi singkat
                </span>
                <input
                  value={s.desc}
                  onChange={(e) => edit(i, { desc: e.target.value })}
                  placeholder="Potong rapi, cuci, finishing pomade."
                  className={inputCls + " mt-1"}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-3">
              <div className="flex flex-wrap items-center gap-4 text-sm text-ink/60">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.active !== false}
                    onChange={(e) => edit(i, { active: e.target.checked })}
                    className="h-4 w-4 accent-brass"
                  />
                  Aktif
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(s.popular)}
                    onChange={(e) => edit(i, { popular: e.target.checked })}
                    className="h-4 w-4 accent-brass"
                  />
                  Tandai favorit
                </label>
                <span className="text-xs text-ink/35">
                  ID: <code>{slugify(s.id || s.name) || "—"}</code> ·{" "}
                  {rupiah(s.price)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  className="rounded-lg border border-ink/15 px-2 py-1 text-xs hover:border-ink/40"
                  title="Naikkan"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  className="rounded-lg border border-ink/15 px-2 py-1 text-xs hover:border-ink/40"
                  title="Turunkan"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(i)}
                  className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-semibold text-ink/60 hover:border-red-300 hover:text-red-600"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-ink/40">
        ID dibuat otomatis dari nama saat disimpan. Ganti nama = ID baru, jadi
        lebih aman ubah harga daripada ubah nama layanan yang sudah sering
        dipesan.
      </p>
    </div>
  );
}
