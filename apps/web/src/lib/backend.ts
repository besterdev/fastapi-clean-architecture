import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@/lib/types";

export const ACCESS_COOKIE = "cw_access";
export const REFRESH_COOKIE = "cw_refresh";

export type BackendLogin = {
  user: User;
  token: { access: string; refresh: string };
};

export async function backend(
  path: string,
  method: string,
  body?: unknown,
  access?: string,
) {
  const base = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

function expiry(token: string): number {
  // Used only to set cookie lifetime; FastAPI verifies JWTs for authorization.
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  if (typeof payload.exp !== "number") throw new Error("Missing token expiry");
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
}

export function sessionResponse(result: BackendLogin) {
  const response = NextResponse.json(result.user, {
    headers: { "Cache-Control": "no-store" },
  });
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure:
      process.env.COOKIE_SECURE === "true" ||
      (process.env.COOKIE_SECURE !== "false" &&
        process.env.NODE_ENV === "production"),
  };
  response.cookies.set(ACCESS_COOKIE, result.token.access, {
    ...options,
    maxAge: expiry(result.token.access),
  });
  response.cookies.set(REFRESH_COOKIE, result.token.refresh, {
    ...options,
    maxAge: expiry(result.token.refresh),
  });
  return response;
}

export function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}

export async function sessionCookies() {
  const jar = await cookies();
  return {
    access: jar.get(ACCESS_COOKIE)?.value,
    refresh: jar.get(REFRESH_COOKIE)?.value,
  };
}
