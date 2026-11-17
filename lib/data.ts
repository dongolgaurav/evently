import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "./supabase/server";
import type { Club, Member } from "./types";

export const CLUB_COOKIE = "evently_club";

type Membership = Member & { clubs: Club };

/** Signed-in user or redirect to /login. */
export const getUser = cache(async () => {
  // Everything behind sign-in is per-request: never prerender or cache it.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

async function loadMemberships(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*, clubs(*)")
    .eq("user_id", userId)
    .neq("tier", "prospect")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Membership[];
}

/**
 * The request's data-access context: the user, their clubs, and the club they are
 * currently working in. Every page and Server Action starts here; RLS enforces the rest.
 */
export const getContext = cache(async () => {
  const { supabase, user } = await getUser();
  let memberships = await loadMemberships(supabase, user.id);
  if (memberships.length === 0) {
    // Pick up roster rows a club admin created for this email address.
    const { data: claimed, error } = await supabase.rpc("claim_memberships");
    if (error) console.error("claim_memberships failed:", error.message);
    if (claimed) memberships = await loadMemberships(supabase, user.id);
  }
  if (memberships.length === 0) redirect("/onboarding");

  const wanted = (await cookies()).get(CLUB_COOKIE)?.value;
  const current = memberships.find((m) => m.club_id === wanted) ?? memberships[0]!;
  const { clubs: club, ...me } = current;
  return {
    supabase,
    user,
    club: { ...club, semester_budget: Number(club.semester_budget) } as Club,
    me: me as Member,
    clubs: memberships.map((m) => m.clubs),
  };
});

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}
