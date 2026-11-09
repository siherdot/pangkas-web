"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/shared";
import BookingsTab from "./tabs/bookings-tab";
import ServicesTab from "./tabs/services-tab";
import BarbersTab from "./tabs/barbers-tab";
import ShopTab from "./tabs/shop-tab";
import UsersTab from "./tabs/users-tab";

type Tab = "booking" | "layanan" | "barber" | "situs" | "akun";

const TABS: { id: Tab; label: string }[] = [
  { id: "booking", label: "Booking" },
  { id: "layanan", label: "Layanan & Harga" },
  { id: "barber", label: "Barber" },
  { id: "situs", label: "Info Website" },
  { id: "akun", label: "Akun" },
];

export default function Dashboard({
  today,
  initialSettings,
  me,
}: {
  today: string;
  initialSettings: Settings;
  me: string;
}) {
  const [tab, setTab] = useState<Tab>("booking");
  const [draft, setDraft] = useState<Settings>(initialSettings);
  const [saved, setSaved] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const router = useRouter();

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const save = useCallback(async () => {
    setSaving(true);
    setErrors([]);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const list = Array.isArray(data?.errors)
          ? data.errors.map(
              (e: { field: string; message: string }) =>
                `${e.field}: ${e.message}`,
            )
          : [data?.message || "Gagal menyimpan."];
        setErrors(list);
        return;
      }
      setSaved(data.settings as Settings);
      setDraft(data.settings as Settings);
      setToast("Tersimpan. Halaman depan langsung memakai data baru.");
      router.refresh();
    } catch {
      setErrors(["Gagal menghubungi server."]);
    } finally {
      setSaving(false);
    }
  }, [draft, router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const shopLabel = `${draft.shop.name} ${draft.shop.tagline}`.trim();

  return (
    <main className="flex-1 bg-cream">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
              <Image
                src="/logo.png"
                alt={shopLabel}
                width={44}
                height={32}
                className="h-7 w-auto object-contain"
              />
            </span>
            <div>
              <p className="display text-xl leading-none">Dashboard</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">
                {shopLabel} · {me}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              target="_blank"
              className="text-ink/50 hover:text-ink"
            >
              Lihat situs
            </Link>
            <button
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="rounded-full bg-brass px-4 py-2 font-semibold text-ink transition hover:bg-brass-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Menyimpan…" : dirty ? "Simpan perubahan" : "Tersimpan"}
            </button>
            <button
              onClick={() => void logout()}
              className="rounded-full border border-ink/15 px-4 py-2 font-semibold hover:border-ink/40"
            >
              Keluar
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition " +
                (tab === t.id
                  ? "border-brass text-ink"
                  : "border-transparent text-ink/45 hover:text-ink/70")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        {toast && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        )}
        {errors.length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Belum bisa disimpan:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {tab === "booking" && <BookingsTab today={today} />}
        {tab === "layanan" && (
          <ServicesTab
            services={draft.services}
            onChange={(services) => setDraft({ ...draft, services })}
          />
        )}
        {tab === "barber" && (
          <BarbersTab
            barbers={draft.barbers}
            onChange={(barbers) => setDraft({ ...draft, barbers })}
          />
        )}
        {tab === "akun" && <UsersTab />}
        {tab === "situs" && (
          <ShopTab
            shop={draft.shop}
            onChange={(shop) => setDraft({ ...draft, shop })}
          />
        )}

        {tab !== "booking" && (
          <p className="mt-6 text-xs text-ink/40">
            Perubahan disimpan ke berkas data di volume server. Tekan
            “Simpan perubahan” di kanan atas setelah selesai mengedit.
          </p>
        )}
      </div>
    </main>
  );
}
