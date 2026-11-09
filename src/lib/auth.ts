import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { userExists, verifyLogin } from "./users";

const COOKIE = "pk_admin";
const MAX_AGE = 60 * 60 * 12; // 12 jam

function secret() {
  return process.env.AUTH_SECRET || "dev-only-insecure-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function b64(v: string) {
  return Buffer.from(v, "utf8").toString("base64url");
}

function unb64(v: string) {
  try {
    return Buffer.from(v, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

export function makeToken(username: string) {
  const payload = `${Date.now() + MAX_AGE * 1000}.${b64(username)}`;
  return `${payload}.${sign(payload)}`;
}

/** Kembalikan username kalau token sah & belum kedaluwarsa, selain itu null. */
export function verifyToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expiry, user, sig] = parts;
  const payload = `${expiry}.${user}`;
  const expected = sign(payload);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expiry) <= Date.now()) return null;
  return unb64(user) || null;
}

/** Username yang sedang login (sudah dicek masih terdaftar), atau null. */
export async function currentAdmin(): Promise<string | null> {
  const jar = await cookies();
  const username = verifyToken(jar.get(COOKIE)?.value);
  if (!username) return null;
  // user yang sudah dihapus langsung kehilangan akses
  return (await userExists(username)) ? username : null;
}

export async function isAdmin() {
  return (await currentAdmin()) !== null;
}

export async function setSession(username: string) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function checkLogin(username: string, password: string) {
  const name = username.trim().toLowerCase() || "admin";
  if (!password) return null;
  return (await verifyLogin(name, password)) ? name : null;
}

export const hasPassword = () => Boolean(process.env.ADMIN_PASSWORD);
