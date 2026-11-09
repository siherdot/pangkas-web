import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login Admin — Pangkas",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="flex flex-1 items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="display flex items-center gap-3 text-cream">
          <Image
            src="/logo.png"
            alt="Hair Style Studio"
            width={80}
            height={59}
            className="h-12 w-auto object-contain"
          />
          <span className="text-2xl">Dashboard Pangkas</span>
        </Link>
        <p className="mt-3 text-sm text-cream/50">
          Masuk untuk melihat & mengelola booking.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
