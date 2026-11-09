import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/store";
import Dashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Pangkas",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <Dashboard today={todayISO()} />;
}
