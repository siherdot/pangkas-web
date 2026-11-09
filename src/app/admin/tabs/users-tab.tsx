"use client";

import { useCallback, useEffect, useState } from "react";

type User = { username: string; createdAt: string; updatedAt: string };

function tanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users as User[]);
        setMe(data.me as string);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(text: string, isError = false) {
    setMsg(isError ? "" : text);
    setErr(isError ? text : "");
    setTimeout(() => {
      setMsg("");
      setErr("");
    }, 4000);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newName, password: newPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return flash(data.message || "Gagal menambah user.", true);
      setUsers(data.users as User[]);
      setNewName("");
      setNewPass("");
      flash("User baru ditambahkan.");
    } finally {
      setBusy(false);
    }
  }

  async function changePass(username: string) {
    const p1 = prompt(`Password baru untuk "${username}" (minimal 8 karakter):`);
    if (p1 === null) return;
    const p2 = prompt("Ulangi password baru:");
    if (p2 === null) return;
    if (p1 !== p2) return flash("Password tidak sama.", true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: p1 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return flash(data.message || "Gagal ganti password.", true);
    setUsers(data.users as User[]);
    flash(`Password "${username}" diganti.`);
  }

  async function remove(username: string) {
    if (!confirm(`Hapus user "${username}"? Aksesnya langsung dicabut.`)) return;
    const res = await fetch(
      `/api/admin/users?username=${encodeURIComponent(username)}`,
      { method: "DELETE" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return flash(data.message || "Gagal menghapus user.", true);
    setUsers(data.users as User[]);
    flash(`User "${username}" dihapus.`);
  }

  return (
    <div>
      <div>
        <h2 className="display text-3xl">Akun admin</h2>
        <p className="mt-1 text-sm text-ink/55">
          Ganti password atau tambah akun lain (misal untuk kasir). Semua akun
          punya akses penuh ke dashboard.
        </p>
      </div>

      {msg && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-wider text-ink/45">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Dibuat</th>
              <th className="px-4 py-3">Password diubah</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink/40">
                  Memuat…
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.username} className="border-t border-ink/5">
                  <td className="px-4 py-3 font-semibold">
                    {u.username}
                    {u.username === me && (
                      <span className="ml-2 rounded bg-moss/10 px-1.5 py-0.5 text-[11px] font-semibold text-moss">
                        kamu
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{tanggal(u.createdAt)}</td>
                  <td className="px-4 py-3 text-ink/60">{tanggal(u.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => void changePass(u.username)}
                        className="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-cream hover:bg-ink/85"
                      >
                        Ganti password
                      </button>
                      <button
                        onClick={() => void remove(u.username)}
                        disabled={u.username === me || users.length <= 1}
                        className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold text-ink/60 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={create}
        className="mt-5 rounded-2xl border border-ink/10 bg-white p-5"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-ink/40">
          Tambah user
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="text-sm font-medium text-ink/70">Username</span>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="kasir1"
              autoCapitalize="none"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass"
            />
          </label>
          <label>
            <span className="text-sm font-medium text-ink/70">
              Password (min 8)
            </span>
            <input
              required
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-brass px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink hover:bg-brass-soft disabled:opacity-60"
            >
              {busy ? "Menyimpan…" : "Tambah user"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink/40">
          Username 3–20 karakter: huruf kecil, angka, titik, garis bawah.
        </p>
      </form>
    </div>
  );
}
