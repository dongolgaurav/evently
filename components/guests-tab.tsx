import { addGuest, removeGuest, setCheckedIn, setGuestStatus, setPublicPage } from "@/lib/rsvp-actions";
import type { EventRow, Rsvp } from "@/lib/types";
import { pct, timeAgo } from "@/lib/format";
import { CopyButton } from "./copy-button";
import { StateForm, SubmitButton } from "./client";
import { Icon, Progress } from "./ui";

const STATUS_CHIP: Record<Rsvp["status"], string> = { going: "chip-green", waitlist: "chip-orange", cancelled: "chip-slate" };

/** Public page switch, share link and QR, and the guest list with check-in. */
export function GuestsTab({ event, rsvps, publicUrl, qr, q }: { event: EventRow; rsvps: Rsvp[]; publicUrl: string | null; qr: string | null; q: string }) {
  const going = rsvps.filter((r) => r.status === "going");
  const waitlist = rsvps.filter((r) => r.status === "waitlist");
  const checkedIn = rsvps.filter((r) => r.checked_in_at);
  const query = q.trim().toLowerCase();
  const shown = rsvps
    .filter((r) => !query || `${r.name} ${r.email}`.toLowerCase().includes(query))
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : ["going", "waitlist", "cancelled"].indexOf(a.status) - ["going", "waitlist", "cancelled"].indexOf(b.status)));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Going", going.length, event.capacity ? `of ${event.capacity}` : "no cap", "text-emerald-700"],
            ["Checked in", checkedIn.length, going.length ? `${pct(checkedIn.length, going.length)}% of going` : "—", "text-primary"],
            ["Waitlist", waitlist.length, waitlist.length ? "waiting for a spot" : "nobody waiting", "text-secondary"],
            ["Cancelled", rsvps.length - going.length - waitlist.length, "dropped out", "text-on-surface-variant"],
          ].map(([k, v, sub, color]) => (
            <div key={k as string} className="card p-4">
              <div className="text-label-sm text-on-surface-variant">{k}</div>
              <div className={`font-display text-headline-lg font-extrabold ${color}`}>{v}</div>
              <div className="text-body-sm text-on-surface-variant">{sub}</div>
            </div>
          ))}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-headline-sm">Guest list</h2>
            <div className="flex flex-wrap items-center gap-2">
              <form className="relative flex items-center">
                <input type="hidden" name="tab" value="guests" />
                <Icon name="search" className="absolute left-3 text-[18px] text-on-surface-variant" />
                <input name="q" defaultValue={q} aria-label="Search guests" placeholder="Search name or email" className="input w-56 pl-9" />
              </form>
              <a href={`/events/${event.id}/guests`} className="btn btn-soft">
                <Icon name="download" className="text-[18px]" /> CSV
              </a>
            </div>
          </div>
          {event.capacity > 0 && (
            <div className="mb-4">
              <Progress value={pct(going.length, event.capacity)} tone={going.length >= event.capacity ? "orange" : "green"} />
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <form action={setCheckedIn}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="on" value={String(!r.checked_in_at)} />
                  <button
                    role="checkbox"
                    aria-checked={Boolean(r.checked_in_at)}
                    aria-label={`${r.checked_in_at ? "Undo check-in for" : "Check in"} ${r.name}`}
                    disabled={r.status === "cancelled"}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors disabled:opacity-30 ${r.checked_in_at ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-300 hover:border-emerald-600 hover:text-emerald-600"}`}
                  >
                    <Icon name="how_to_reg" className="text-[20px]" />
                  </button>
                </form>
                <div className="min-w-40 flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-body-sm text-on-surface-variant">
                    {r.email} · {r.source === "manual" ? "added by organiser" : `signed up ${timeAgo(r.created_at)}`}
                    {r.checked_in_at && ` · checked in ${timeAgo(r.checked_in_at)}`}
                  </div>
                </div>
                <span className={`chip ${STATUS_CHIP[r.status]}`}>{r.status === "going" ? "Going" : r.status === "waitlist" ? "Waitlist" : "Cancelled"}</span>
                <div className="flex items-center gap-1">
                  {r.status !== "going" && (
                    <form action={setGuestStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="going" />
                      <SubmitButton className="btn btn-sm btn-soft">{r.status === "waitlist" ? "Move to going" : "Restore"}</SubmitButton>
                    </form>
                  )}
                  {r.status === "going" && !r.checked_in_at && (
                    <form action={setGuestStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <SubmitButton className="btn btn-sm btn-ghost">Cancel</SubmitButton>
                    </form>
                  )}
                  <form action={removeGuest}>
                    <input type="hidden" name="id" value={r.id} />
                    <button aria-label={`Remove ${r.name}`} className="rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-on-error-container">
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="py-6 text-center text-on-surface-variant">
                {rsvps.length ? "No guests match that search." : event.public_page ? "No RSVPs yet. Share the link to get the first ones." : "No guests yet. Turn on the public page to collect RSVPs, or add guests below."}
              </li>
            )}
          </ul>
          <StateForm action={addGuest} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="event_id" value={event.id} />
            <input className="input" name="name" placeholder="Guest name" aria-label="Guest name" required />
            <input className="input" type="email" name="email" placeholder="Email" aria-label="Guest email" required />
            <SubmitButton className="btn btn-soft">Add guest</SubmitButton>
          </StateForm>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card p-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-headline-sm">
              <Icon name="public" className="text-[22px] text-primary" /> Public RSVP page
            </h2>
            <span className={`chip ${event.public_page ? "chip-green" : "chip-slate"}`}>{event.public_page ? "Live" : "Off"}</span>
          </div>
          <p className="mb-4 text-on-surface-variant">
            {event.public_page
              ? "Anyone with the link can see the event and RSVP. Each guest gets a ticket with a QR code."
              : "Turn this on to get a shareable page where students RSVP without an account."}
          </p>
          <form action={setPublicPage}>
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="on" value={String(!event.public_page)} />
            <SubmitButton className={`btn w-full ${event.public_page ? "btn-soft" : "btn-primary"}`} pendingText="Saving…">
              {event.public_page ? "Turn off public page" : "Turn on public RSVPs"}
            </SubmitButton>
          </form>
          {event.public_page && publicUrl && (
            <>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-container-low p-2">
                <span className="min-w-0 flex-1 truncate text-body-sm">{publicUrl}</span>
                <CopyButton text={publicUrl} />
              </div>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-soft mt-2 w-full">
                <Icon name="open_in_new" className="text-[18px]" /> Open the page
              </a>
              {qr && (
                <div className="mt-4 text-center">
                  <div className="mx-auto w-44 rounded-xl border border-slate-200 p-2 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="QR code for the RSVP page" dangerouslySetInnerHTML={{ __html: qr }} />
                  <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} download={`${event.slug}-rsvp-qr.svg`} className="mt-2 inline-flex items-center gap-1 text-label-md text-primary">
                    <Icon name="download" className="text-[16px]" /> Download QR for posters
                  </a>
                </div>
              )}
            </>
          )}
        </section>
        <section className="card p-6">
          <h2 className="mb-2 flex items-center gap-2 text-headline-sm">
            <Icon name="qr_code_scanner" className="text-[22px] text-tertiary" /> Checking people in
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-body-sm text-on-surface-variant">
            <li>Guests show the QR code on their ticket.</li>
            <li>Scan it with your phone&apos;s camera while signed in to Evently.</li>
            <li>Tap <b>Check in</b>. No app needed.</li>
          </ol>
          <p className="mt-2 text-body-sm text-on-surface-variant">No ticket? Tick them off on the guest list here instead.</p>
        </section>
      </aside>
    </div>
  );
}
