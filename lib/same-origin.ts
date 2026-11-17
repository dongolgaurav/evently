import "server-only";
import type { NextRequest } from "next/server";

/** Native form posts to route handlers have no built-in CSRF check, so require our own origin. */
export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
}
