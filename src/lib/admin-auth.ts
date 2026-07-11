import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET?.trim() || getAdminPassword();
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected || !password) return false;

  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminToken(): string {
  const secret = getAdminSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD / ADMIN_SECRET not configured");

  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const secret = getAdminSecret();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return request.headers.get("x-admin-token")?.trim() ?? null;
}
