import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { categoryImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { rsvpToEvent } from "@/lib/rsvp-actions";
import { fmtTime, fmtWeekday, pct } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { StateForm, SubmitButton } from "@/components/client";
import { Icon, Progress } from "@/components/ui";
import { categoryStyle } from "@/components/event-card";

type PublicEvent = {
  title: string;
  category: string;
  concept: string | null;
  event_date: string | null;
  time_window: string | null;
  venue: string | null;
  location: string | null;
  capacity: number;
  going: number;
  rsvp_open: boolean;
  club_name: string;
  club_full_name: string | null;
  timeline: { time: string; title: string; location: string | null }[];
};

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_event", { p_slug: slug });
  return (data as PublicEvent | null) ?? null;
}

export async function generateMetadata({ params }: Props) {
  const e = await load((await params).slug);
  return e ? { title: `${e.title} · ${e.club_name}`, description: e.concept ?? `RSVP to ${e.title}, hosted by ${e.club_name}.` } : { title: "Event not found" };
}

export default function PublicEventPage({ params }: Props) {
  return (
    <PublicShell>
      <Suspense fallback={<div className="card mt-6 h-96 animate-pulse" />}>
        <EventDetails params={params} />
      </Suspense>
    </PublicShell>
  );
}

async function EventDetails({ params }: Props) {
  const { slug } = await params;
  const e = await load(slug);
  if (!e) notFound();
  const style = categoryStyle(e.category);
  const full = e.capacity > 0 && e.going >= e.capacity;
  const left = e.capacity > 0 ? Math.max(0, e.capacity - e.going) : null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-5">
      <article className="space-y-6 lg:col-span-3">
        <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl sm:p-8">
          <Image src={categoryImage(e.category)} alt="" fill priority placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-primary/75 to-tertiary/60" />
          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-label-sm">
                <Icon name={style.icon} className="text-[16px]" /> {e.category}
              </span>
              <span className="text-label-sm text-on-primary-container">Hosted by {e.club_full_name ?? e.club_name}</span>
            </div>
            <h1 className="text-[2rem] leading-tight font-extrabold tracking-tight sm:text-headline-lg">{e.title}</h1>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["calendar_month", "When", `${fmtWeekday(e.event_date)}${e.time_window ? ` · ${e.time_window}` : ""}`],
                ["location_on", "Where", [e.venue, e.location].filter(Boolean).join(", ") || "Location to be announced"],
              ].map(([icon, k, v]) => (
                <div key={k} className="flex gap-3 rounded-xl bg-white/10 p-3">
                  <Icon name={icon!} className="text-[22px] text-tertiary-fixed" />
                  <div>
                    <dt className="text-label-sm text-on-primary-container">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {e.concept && (
          <section className="card p-6">
            <h2 className="mb-2 text-headline-sm">About this event</h2>
            <p className="text-body-lg whitespace-pre-line text-on-surface-variant">{e.concept}</p>
          </section>
        )}

        {e.timeline.length > 0 && (
          <section className="card p-6">
            <h2 className="mb-4 text-headline-sm">Schedule</h2>
            <ol className="relative ml-1.5 space-y-4 border-l-2 border-surface-container-high pl-5">
              {e.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1 -left-[27px] h-3 w-3 rounded-full bg-primary ring-4 ring-white" />
                  <span className="text-label-md font-bold text-primary">{fmtTime(t.time)}</span>
                  <div className="font-semibold">{t.title}</div>
                  {t.location && <div className="text-body-sm text-on-surface-variant">{t.location}</div>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>

      <aside className="lg:col-span-2">
        <section className="card sticky top-6 p-6">
          <h2 className="text-headline-sm">{e.rsvp_open ? (full ? "Join the waitlist" : "RSVP") : "RSVPs are closed"}</h2>
          <div className="my-4">
            <div className="mb-1 flex justify-between text-label-md">
              <span><b>{e.going}</b> going</span>
              {left !== null && <span className={full ? "text-secondary" : "text-on-surface-variant"}>{full ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}</span>}
            </div>
            {e.capacity > 0 && <Progress value={pct(e.going, e.capacity)} tone={full ? "orange" : "primary"} />}
          </div>
          {e.rsvp_open ? (
            <StateForm action={rsvpToEvent} className="space-y-3">
              <input type="hidden" name="slug" value={slug} />
              {/* Hidden from people; bots tend to fill it in. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              <label className="block">
                <span className="field-label">Your name</span>
                <input className="input" name="name" autoComplete="name" required maxLength={80} />
              </label>
              <label className="block">
                <span className="field-label">Email</span>
                <input className="input" type="email" name="email" autoComplete="email" required maxLength={200} />
              </label>
              <SubmitButton className="btn btn-accent h-12 w-full text-body-lg" pendingText="Saving your spot…">
                {full ? "Join the waitlist" : "I'm going"}
              </SubmitButton>
              <p className="text-body-sm text-on-surface-variant">
                You&apos;ll get a ticket with a QR code to show at the door. Your details are only shared with {e.club_name}.
              </p>
            </StateForm>
          ) : (
            <p className="text-on-surface-variant">This event has already happened or is no longer taking RSVPs.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
