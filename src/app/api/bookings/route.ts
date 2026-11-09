import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createBooking, listBookings } from "@/lib/store";
import { serviceById, barberById } from "@/lib/catalog";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const rows = await listBookings({
    date: url.searchParams.get("date") || undefined,
    q: url.searchParams.get("q") || undefined,
  });
  return NextResponse.json(
    rows.map((b) => ({
      ...b,
      serviceName: serviceById(b.serviceId)?.name ?? b.serviceId,
      servicePrice: serviceById(b.serviceId)?.price ?? 0,
      serviceDuration: serviceById(b.serviceId)?.duration ?? 30,
      barberName: barberById(b.barberId)?.name ?? b.barberId,
    })),
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const serviceId = String(body.serviceId ?? "");
  const barberId = String(body.barberId ?? "");
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");
  const note = body.note ? String(body.note) : undefined;

  if (name.length < 2) {
    return NextResponse.json({ message: "Nama minimal 2 karakter." }, { status: 422 });
  }
  if (!/^(\+?62|0)8\d{7,12}$/.test(phone.replace(/[\s-]/g, ""))) {
    return NextResponse.json({ message: "Nomor WhatsApp tidak valid." }, { status: 422 });
  }
  if (!serviceById(serviceId) || !barberById(barberId)) {
    return NextResponse.json({ message: "Layanan atau barber tidak dikenal." }, { status: 422 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ message: "Tanggal atau jam tidak valid." }, { status: 422 });
  }

  try {
    const booking = await createBooking({ name, phone, serviceId, barberId, date, time, note });
    return NextResponse.json(
      { ok: true, code: booking.code, id: booking.id },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json({ error: "SLOT_TAKEN" }, { status: 409 });
    }
    console.error("[booking] create failed", err);
    return NextResponse.json({ message: "Gagal menyimpan booking." }, { status: 500 });
  }
}
