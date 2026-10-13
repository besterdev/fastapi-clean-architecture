import { NextRequest, NextResponse } from "next/server";
import {
  backend,
  clearSession,
  sessionCookies,
  sessionResponse,
  type BackendLogin,
} from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

function error(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const route = path.join("/");
  const method = request.method;
  const publicPost = ["users/register", "users/login"];
  const sessionPost = ["users/refresh-token", "users/logout"];
  const dataGet =
    /^data\/(users|user-tokens|user-permissions)(\/(describe|[1-9]\d*))?$/.test(
      route,
    );
  const allowed =
    method === "POST"
      ? [...publicPost, ...sessionPost].includes(route)
      : method === "GET" &&
        (route === "health" || route === "users/profile" || dataGet);
  if (!allowed) return error("Route not found", 404);

  if (method === "POST") {
    const origin = process.env.WEB_ORIGIN || new URL(request.url).origin;
    if (request.headers.get("origin") !== origin)
      return error("Invalid request origin", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return error("JSON request required", 415);
    }
  }

  try {
    let body: unknown;
    if (method === "POST") {
      const raw = await request.text();
      if (raw.length > 16384) return error("Request too large", 413);
      try {
        body = JSON.parse(raw);
      } catch {
        return error("Invalid JSON", 400);
      }
    }
    const session = await sessionCookies();
    if (sessionPost.includes(route)) {
      if (!session.refresh) {
        const response =
          route === "users/logout"
            ? NextResponse.json(null)
            : error("Please sign in again", 401);
        return clearSession(response);
      }
      const result = await backend(`/${route}`, "POST", {
        refresh_token: session.refresh,
      });
      if (route === "users/logout") {
        if (result.status < 300 || result.status === 401) {
          return clearSession(
            NextResponse.json(null, {
              headers: { "Cache-Control": "no-store" },
            }),
          );
        }
      } else if (result.status === 200) {
        return sessionResponse(result.data as BackendLogin);
      }
      const response = NextResponse.json(
        result.data || { message: "Unable to complete request" },
        {
          status: result.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
      return result.status === 401 ? clearSession(response) : response;
    }
    if (method === "GET" && route !== "health" && !session.access) {
      return error("Please sign in", 401);
    }
    let upstream = route === "health" ? "/" : `/${route}`;
    if (dataGet && path.length === 2) upstream += "/";
    const query = new URLSearchParams();
    if (dataGet && path.length === 2) {
      for (const key of ["_page", "_pageSize"]) {
        const value = request.nextUrl.searchParams.get(key);
        if (value !== null) query.set(key, value);
      }
    }
    if (query.size) upstream += `?${query}`;
    const result = await backend(upstream, method, body, session.access);
    if (route === "users/login" && result.status === 200) {
      return sessionResponse(result.data as BackendLogin);
    }
    return NextResponse.json(
      result.data || { message: "Unable to complete request" },
      {
        status: result.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return error("The service is unavailable. Please try again.", 502);
  }
}

export const GET = handle;
export const POST = handle;
