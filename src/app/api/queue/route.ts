import { NextResponse } from "next/server";
import { queueSnapshot } from "@/lib/store";

/** Kondisi antrian terkini satu barber pada satu tanggal (tanpa pemilihan jam). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const barber = url.searchParams.get("barber") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !barber) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const snap = await queueSnapshot(date, barber);
  return NextResponse.json(snap, { headers: { "Cache-Control": "no-store" } });
}
