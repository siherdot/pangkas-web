import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readSettings, saveSettings, validateSettings } from "@/lib/settings";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await readSettings(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body tidak valid." }, { status: 400 });
  }
  const checked = validateSettings(body);
  if (!checked.ok || !checked.value) {
    return NextResponse.json(
      { error: "VALIDATION", errors: checked.errors },
      { status: 422 },
    );
  }
  const saved = await saveSettings(checked.value);
  return NextResponse.json({ ok: true, settings: saved });
}
