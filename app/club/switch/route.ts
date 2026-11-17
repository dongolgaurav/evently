import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLUB_COOKIE } from "@/lib/data";
import { isSameOrigin } from "@/lib/same-origin";

// Switching clubs changes every page, so it is a full page load rather than a client navigation.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const id = String((await request.formData()).get("club_id") ?? "");
  const res = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { data } = await supabase.from("members").select("id").eq("club_id", id).eq("user_id", user.id).maybeSingle();
  if (data) res.cookies.set(CLUB_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  return res;
}
