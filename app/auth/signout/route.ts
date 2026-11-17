import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLUB_COOKIE } from "@/lib/data";
import { isSameOrigin } from "@/lib/same-origin";

// A plain form POST, so the browser does a full page load and drops every cached page.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.delete(CLUB_COOKIE);
  return res;
}
