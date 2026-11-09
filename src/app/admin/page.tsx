import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/store";
import { readSettings } from "@/lib/settings";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { shop } = await readSettings();
  return {
    title: `Dashboard — ${shop.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const settings = await readSettings();
  return <Dashboard today={todayISO()} initialSettings={settings} />;
}
