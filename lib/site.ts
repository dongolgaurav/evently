import "server-only";
import { headers } from "next/headers";

/** The origin this request was served from, e.g. https://evently-seven-theta.vercel.app */
export async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
