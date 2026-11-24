import Link from "next/link";
import { getContext } from "@/lib/data";
import { setCheckedIn } from "@/lib/rsvp-actions";
import { fmtWeekday, timeAgo } from "@/lib/format";
import { SubmitButton } from "@/components/client";
import { Icon } from "@/components/ui";

export const metadata = { title: "Check in" };

/** Opened by scanning a guest's ticket QR code with a phone camera. */
export default async function CheckInPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await getContext();
  const { data } = /^[0-9a-f]{32}$/.test(code)
    ? await ctx.supabase.from("rsvps").select("*, events(id, title, event_date)").eq("check_in_code", code).maybeSingle()
    : { data: null };
  const r = data as
    | { id: string; name: string; email: string; status: string; checked_in_at: string | null; events: { id: string; title: string; event_date: string | null } }
    | null;

  if (!r) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <div className="card p-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-on-error-container">
            <Icon name="error" className="text-[36px]" />
          </span>
          <h1 className="text-headline-md">Ticket not found</h1>
          <p className="mt-2 text-on-surface-variant">
            This ticket isn&apos;t for an event in <b>{ctx.club.name}</b>. If you organise more than one club, switch to the right club in the sidebar and scan again.
          </p>
        </div>
      </div>
    );
  }
  const done = Boolean(r.checked_in_at);
  const notGoing = r.status !== "going";
  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="card p-8 text-center">
        <span className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : notGoing ? "bg-orange-100 text-orange-800" : "bg-primary-fixed text-primary"}`}>
          <Icon name={done ? "how_to_reg" : notGoing ? "warning" : "qr_code_scanner"} className="text-[36px]" />
        </span>
        <p className="text-label-sm tracking-wider text-on-surface-variant uppercase">{r.events.title} · {fmtWeekday(r.events.event_date)}</p>
        <h1 className="mt-1 text-headline-lg">{r.name}</h1>
        <p className="text-on-surface-variant">{r.email}</p>
        {done ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">Checked in {timeAgo(r.checked_in_at!)}</p>
        ) : (
          <>
            {notGoing && (
              <p className="mt-4 rounded-xl bg-orange-100 p-3 text-orange-900">
                This guest is {r.status === "waitlist" ? "on the waitlist" : "marked as cancelled"}. Checking them in moves them to &ldquo;going&rdquo;.
              </p>
            )}
            <form action={setCheckedIn} className="mt-6">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="on" value="true" />
              <SubmitButton className="btn btn-primary h-14 w-full text-body-lg" pendingText="Checking in…">
                <Icon name="how_to_reg" className="text-[22px]" /> Check in {r.name.split(" ")[0]}
              </SubmitButton>
            </form>
          </>
        )}
        <Link href={`/events/${r.events.id}?tab=guests`} className="btn btn-soft mt-3 w-full">
          Open the guest list
        </Link>
      </div>
      <p className="mt-4 text-center text-body-sm text-on-surface-variant">Scan the next ticket with your phone&apos;s camera.</p>
    </div>
  );
}
