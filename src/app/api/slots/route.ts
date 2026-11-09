import { NextResponse } from "next/server";
import { availability } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const service = url.searchParams.get("service") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !service) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const result = await availability(date, service);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
