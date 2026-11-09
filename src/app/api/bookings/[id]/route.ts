import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { setStatus } from "@/lib/store";
import type { BookingStatus } from "@/lib/store";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }
  const status = body.status as BookingStatus;
  if (!["pending", "confirmed", "done", "cancelled"].includes(status)) {
    return NextResponse.json({ message: "Status tidak valid." }, { status: 422 });
  }
  try {
    const row = await setStatus(id, status);
    return NextResponse.json({ ok: true, status: row.status });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Booking tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ message: "Gagal memperbarui." }, { status: 500 });
  }
}
