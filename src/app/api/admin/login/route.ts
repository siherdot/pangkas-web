import { NextResponse } from "next/server";
import { checkPassword, hasPassword, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (!hasPassword()) {
    return NextResponse.json(
      { message: "ADMIN_PASSWORD belum diatur di server." },
      { status: 500 },
    );
  }
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }
  if (!checkPassword(String(body.password ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // perlambat brute force
    return NextResponse.json({ message: "Password salah." }, { status: 401 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}
