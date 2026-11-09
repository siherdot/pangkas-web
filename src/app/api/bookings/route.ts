import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createBooking, decorate, listBookings } from "@/lib/store";
import { readSettings } from "@/lib/settings";
import { clientIp, releaseBookingSlot, reserveBookingSlot } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const rows = await listBookings({
    date: url.searchParams.get("date") || undefined,
    q: url.searchParams.get("q") || undefined,
  });
  const settings = await readSettings();
  return NextResponse.json(decorate(rows, settings));
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
  const pax = Math.min(5, Math.max(1, Math.round(Number(body.pax) || 1)));
  const note = body.note ? String(body.note) : undefined;

  if (name.length < 2) {
    return NextResponse.json({ message: "Nama minimal 2 karakter." }, { status: 422 });
  }
  if (!/^(\+?62|0)8\d{7,12}$/.test(phone.replace(/[\s-]/g, ""))) {
    return NextResponse.json({ message: "Nomor WhatsApp tidak valid." }, { status: 422 });
  }
  const settings = await readSettings();
  if (
    !settings.services.some((s) => s.id === serviceId && s.active !== false) ||
    !settings.barbers.some((b) => b.id === barberId && b.active !== false)
  ) {
    return NextResponse.json({ message: "Layanan atau barber tidak dikenal." }, { status: 422 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Tanggal tidak valid." }, { status: 422 });
  }

  const ip = clientIp(request.headers);
  const quota = await reserveBookingSlot(ip);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: `Terlalu banyak booking dari jaringan ini (${quota.limitHour}/jam, ${quota.limitDay}/hari). Coba lagi dalam ${quota.retryMinutes} menit.`,
        retryMinutes: quota.retryMinutes,
      },
      { status: 429, headers: { "Retry-After": String(quota.retryMinutes * 60) } },
    );
  }

  try {
    const { booking, queue } = await createBooking({
      name,
      phone,
      serviceId,
      barberId,
      date,
      pax,
      note,
      ip,
    });
    return NextResponse.json(
      { ok: true, code: booking.code, id: booking.id, queue },
      { status: 201 },
    );
  } catch (err) {
    await releaseBookingSlot(ip);
    if (err instanceof Error && err.message === "SLOT_PAST") {
      return NextResponse.json(
        { error: "SLOT_PAST", message: "Tanggal itu sudah lewat. Pilih tanggal lain." },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message === "SHOP_CLOSED") {
      return NextResponse.json(
        {
          error: "SHOP_CLOSED",
          message: "Sudah lewat jam tutup hari ini. Silakan pilih tanggal berikutnya.",
        },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message.startsWith("DUPLICATE|")) {
      const code = err.message.split("|")[1];
      return NextResponse.json(
        {
          error: "DUPLICATE",
          message: `Nomor WhatsApp ini sudah punya booking aktif di tanggal itu (kode ${code}). Satu nomor hanya boleh satu booking per tanggal — batalkan yang lama dulu kalau mau ganti.`,
          existingCode: code,
        },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message === "SERVICE_UNKNOWN") {
      return NextResponse.json({ message: "Layanan tidak tersedia." }, { status: 422 });
    }
    if (err instanceof Error && err.message === "BARBER_UNKNOWN") {
      return NextResponse.json({ message: "Barber tidak tersedia." }, { status: 422 });
    }
    console.error("[booking] create failed", err);
    return NextResponse.json({ message: "Gagal menyimpan booking." }, { status: 500 });
  }
}
