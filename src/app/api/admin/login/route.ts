import { NextResponse } from "next/server";
import { checkLogin, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }
  const username = String(body.username ?? "admin");
  const password = String(body.password ?? "");
  const user = await checkLogin(username, password);
  if (!user) {
    await new Promise((r) => setTimeout(r, 600)); // perlambat brute force
    return NextResponse.json(
      { message: "Username atau password salah." },
      { status: 401 },
    );
  }
  await setSession(user);
  return NextResponse.json({ ok: true, username: user });
}
