"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { getContext } from "./data";
import type { FormState } from "./actions";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const refresh = () => revalidatePath("/", "layout");

const slugify = (title: string) =>
  `${title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "event"}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------- public (no sign-in)
/** RSVP from the public event page. Sends the guest to their ticket. */
export async function rsvpToEvent(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, "website")) return { message: "Thanks!" }; // Honeypot: bots fill hidden fields.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_rsvp", {
    p_slug: str(fd, "slug"),
    p_name: str(fd, "name"),
    p_email: str(fd, "email"),
  });
  if (error) return { error: error.message };
  const r = data as { already: boolean; status: string; code?: string };
  if (r.already) {
    return {
      message:
        r.status === "waitlist"
          ? "You're already on the waitlist for this event with that email."
          : "You're already registered with that email. Use the ticket link you got when you RSVP'd, or just give your name at the door.",
    };
  }
  return { redirect: `/t/${r.code}` };
}

export async function cancelMyRsvp(fd: FormData) {
  const supabase = await createClient();
  await supabase.rpc("public_cancel_rsvp", { p_code: str(fd, "code") });
  revalidatePath(`/t/${str(fd, "code")}`);
}

// ---------------------------------------------------------------- organisers
async function eventInClub(id: string) {
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("events").select("id, title, slug, public_page").eq("id", id).eq("club_id", ctx.club.id).maybeSingle();
  if (!data) throw new Error("Event not found in this club.");
  return { ctx, event: data as { id: string; title: string; slug: string | null; public_page: boolean } };
}

export async function setPublicPage(fd: FormData) {
  const { ctx, event } = await eventInClub(str(fd, "event_id"));
  const on = str(fd, "on") === "true";
  const patch: Record<string, unknown> = { public_page: on };
  if (on && !event.slug) patch.slug = slugify(event.title);
  const { error } = await ctx.supabase.from("events").update(patch).eq("id", event.id);
  if (error) throw new Error(error.message);
  await ctx.supabase.from("activity").insert({
    club_id: ctx.club.id,
    event_id: event.id,
    actor_name: ctx.me.full_name,
    message: on ? `opened public RSVPs for "${event.title}"` : `closed the public page for "${event.title}"`,
  });
  refresh();
}

export async function addGuest(_: FormState, fd: FormData): Promise<FormState> {
  const { ctx, event } = await eventInClub(str(fd, "event_id"));
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  if (!name) return { error: "Enter the guest's name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  const { error } = await ctx.supabase.from("rsvps").insert({
    club_id: ctx.club.id,
    event_id: event.id,
    name,
    email,
    status: str(fd, "status") === "waitlist" ? "waitlist" : "going",
    source: "manual",
  });
  if (error) return { error: error.code === "23505" ? "That email is already on the guest list." : error.message };
  refresh();
  return { message: `${name} added to the guest list.` };
}

export async function setGuestStatus(fd: FormData) {
  const ctx = await getContext();
  const status = str(fd, "status");
  if (!["going", "waitlist", "cancelled"].includes(status)) return;
  const { error } = await ctx.supabase.from("rsvps").update({ status }).eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  refresh();
}

export async function setCheckedIn(fd: FormData) {
  const ctx = await getContext();
  const on = str(fd, "on") === "true";
  const { error } = await ctx.supabase
    .from("rsvps")
    .update(on ? { checked_in_at: new Date().toISOString(), status: "going" } : { checked_in_at: null })
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeGuest(fd: FormData) {
  const ctx = await getContext();
  const { error } = await ctx.supabase.from("rsvps").delete().eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  refresh();
}
