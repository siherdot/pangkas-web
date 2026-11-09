"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Gagal login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <label className="block text-sm">
        <span className="font-medium text-cream/70">Username</span>
        <input
          autoCapitalize="none"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-2 w-full rounded-xl border border-cream/20 bg-cream/5 px-4 py-3 text-cream outline-none focus:border-brass"
        />
      </label>
      <label className="mt-4 block text-sm">
        <span className="font-medium text-cream/70">Password</span>
        <input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-cream/20 bg-cream/5 px-4 py-3 text-cream outline-none focus:border-brass"
        />
      </label>
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brass px-5 py-3 text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-brass-soft disabled:opacity-60"
      >
        {loading ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
