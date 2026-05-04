import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "video_ai_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export type Session = { email: string };

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  if (email !== env.ADMIN_EMAIL) return false;
  return bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
}

export async function createSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Only set Secure when serving over HTTPS — otherwise browsers refuse to
    // send the cookie back on subsequent HTTP requests (server actions, RSC),
    // causing the middleware to redirect to /login mid-session.
    secure: env.APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
