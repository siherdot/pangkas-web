import { NextResponse } from "next/server";
import { currentAdmin, isAdmin } from "@/lib/auth";
import {
  addUser,
  changePassword,
  publicUsers,
  readUsers,
  removeUser,
} from "@/lib/users";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(
    { users: publicUsers(await readUsers()), me: await currentAdmin() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const res = await addUser(String(body.username ?? ""), String(body.password ?? ""));
  if (!res.ok) return NextResponse.json({ message: res.message }, { status: 422 });
  return NextResponse.json(
    { ok: true, users: publicUsers(await readUsers()) },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const res = await changePassword(
    String(body.username ?? ""),
    String(body.password ?? ""),
  );
  if (!res.ok) return NextResponse.json({ message: res.message }, { status: 422 });
  return NextResponse.json({ ok: true, users: publicUsers(await readUsers()) });
}

export async function DELETE(request: Request) {
  const me = await currentAdmin();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const username = url.searchParams.get("username") ?? "";
  if (username.toLowerCase() === me) {
    return NextResponse.json(
      { message: "Tidak bisa menghapus akun yang sedang dipakai login." },
      { status: 422 },
    );
  }
  const res = await removeUser(username);
  if (!res.ok) return NextResponse.json({ message: res.message }, { status: 422 });
  return NextResponse.json({ ok: true, users: publicUsers(await readUsers()) });
}
