import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type AdminUser = {
  username: string;
  hash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = { username: string; createdAt: string; updatedAt: string };

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "users.json");

let lock: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
}

type Db = { users: AdminUser[] };

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function makeUser(username: string, password: string): AdminUser {
  const salt = randomBytes(16).toString("hex");
  const now = new Date().toISOString();
  return {
    username,
    salt,
    hash: hashPassword(password, salt),
    createdAt: now,
    updatedAt: now,
  };
}

async function writeDb(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

/** Baca daftar user; kalau file belum ada, buat dari ADMIN_PASSWORD env (user "admin"). */
export async function readUsers(): Promise<AdminUser[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Db;
    if (Array.isArray(parsed.users) && parsed.users.length) return parsed.users;
  } catch {
    /* file belum ada */
  }
  const seed = process.env.ADMIN_PASSWORD;
  if (!seed) return [];
  const user = makeUser("admin", seed);
  await withLock(async () => writeDb({ users: [user] }));
  return [user];
}

export function publicUsers(users: AdminUser[]): PublicUser[] {
  return users.map((u) => ({
    username: u.username,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
}

export function validUsername(raw: string) {
  return /^[a-z0-9][a-z0-9._-]{2,19}$/.test(raw);
}

export type UserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; message: string };

export async function verifyLogin(username: string, password: string) {
  const users = await readUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return false;
  const candidate = Buffer.from(hashPassword(password, user.salt), "hex");
  const stored = Buffer.from(user.hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export async function userExists(username: string) {
  const users = await readUsers();
  return users.some((u) => u.username === username);
}

export async function addUser(rawName: string, password: string): Promise<UserResult> {
  const username = rawName.trim().toLowerCase();
  if (!validUsername(username)) {
    return {
      ok: false,
      message:
        "Username 3–20 karakter, huruf kecil/angka/titik/garis bawah saja.",
    };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password minimal 8 karakter." };
  }
  return withLock(async () => {
    const users = await readUsers();
    if (users.some((u) => u.username === username)) {
      return { ok: false as const, message: `Username "${username}" sudah dipakai.` };
    }
    const user = makeUser(username, password);
    await writeDb({ users: [...users, user] });
    return {
      ok: true as const,
      user: { username, createdAt: user.createdAt, updatedAt: user.updatedAt },
    };
  });
}

export async function changePassword(
  rawName: string,
  password: string,
): Promise<UserResult> {
  const username = rawName.trim().toLowerCase();
  if (password.length < 8) {
    return { ok: false, message: "Password minimal 8 karakter." };
  }
  return withLock(async () => {
    const users = await readUsers();
    const idx = users.findIndex((u) => u.username === username);
    if (idx === -1) return { ok: false as const, message: "User tidak ditemukan." };
    const salt = randomBytes(16).toString("hex");
    users[idx] = {
      ...users[idx],
      salt,
      hash: hashPassword(password, salt),
      updatedAt: new Date().toISOString(),
    };
    await writeDb({ users });
    const u = users[idx];
    return {
      ok: true as const,
      user: { username: u.username, createdAt: u.createdAt, updatedAt: u.updatedAt },
    };
  });
}

export async function removeUser(rawName: string): Promise<UserResult> {
  const username = rawName.trim().toLowerCase();
  return withLock(async () => {
    const users = await readUsers();
    if (users.length <= 1) {
      return { ok: false as const, message: "Minimal harus ada satu user admin." };
    }
    const target = users.find((u) => u.username === username);
    if (!target) return { ok: false as const, message: "User tidak ditemukan." };
    await writeDb({ users: users.filter((u) => u.username !== username) });
    return {
      ok: true as const,
      user: {
        username: target.username,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      },
    };
  });
}
