import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const TOKEN_COOKIE = "auth_token";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const OTP_SECRET = process.env.OTP_SECRET || "otp-secret-change-me";

export function signSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

export function hashToken(value: string, salt = OTP_SECRET): string {
  return crypto.createHmac("sha256", salt).update(value).digest("hex");
}

export function generateOtp(): string {
  const val = crypto.randomInt(0, 1000000);
  return val.toString().padStart(6, "0");
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
