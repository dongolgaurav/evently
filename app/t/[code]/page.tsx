import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelMyRsvp } from "@/lib/rsvp-actions";
import { qrSvg } from "@/lib/qr";
import { siteUrl } from "@/lib/site";
import { fmtWeekday } from "@/lib/format";
import { PublicShell } from "@/components/public-shell";
import { SubmitButton, PrintButton } from "@/components/client";
import { Icon } from "@/components/ui";

export const metadata = { title: "Your ticket", robots: { index: false } };

type Ticket = {
  name: string;
  status: "going" | "waitlist" | "cancelled";
  checked_in_at: string | null;
  title: string;
  event_date: string | null;
  time_window: string | null;
  venue: string | null;
  location: string | null;
  slug: string | null;
  club_name: string;
};

type Props = { params: Promise<{ code: string }> };

export default function TicketPage({ params }: Props) {
  return (
    <PublicShell>
      <Suspense fallback={<div className="card mx-auto mt-6 h-96 max-w-md animate-pulse" />}>
        <TicketView params={params} />
      </Suspense>
    </PublicShell>
  );
}

async function TicketView({ params }: Props) {
  const { code } = await params;
  if (!/^[0-9a-f]{32}$/.test(code)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_ticket", { p_code: code });
  const t = data as Ticket | null;
  if (!t) notFound();
  const site = await siteUrl();
  const svg = t.status === "going" ? await qrSvg(`${site}/checkin/${code}`) : null;
  const tone = { going: "bg-emerald-50 text-emerald-800", waitlist: "bg-orange-100 text-orange-800", cancelled: "bg-surface-container-high text-on-surface-variant" }[t.status];
  const label = t.checked_in_at ? "Checked in" : { going: "You're going", waitlist: "On the waitlist", cancelled: "RSVP cancelled" }[t.status];

  return (
    <div className="mx-auto mt-4 max-w-md">
      <article className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-container to-tertiary-container p-6 text-white">
          <div className="text-label-sm text-on-primary-container uppercase">{t.club_name}</div>
          <h1 className="mt-1 text-headline-md font-bold">{t.title}</h1>
          <p className="mt-2 text-on-primary-container">
            {fmtWeekday(t.event_date)}
            {t.time_window ? ` · ${t.time_window}` : ""}
            <br />
            {[t.venue, t.location].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="p-6 text-center">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-md font-semibold ${t.checked_in_at ? "bg-primary-fixed text-primary" : tone}`}>
            <Icon name={t.checked_in_at ? "verified" : t.status === "going" ? "check_circle" : t.status === "waitlist" ? "hourglass_top" : "cancel"} className="text-[18px]" />
            {label}
          </span>
          <p className="mt-3 font-display text-headline-sm">{t.name}</p>
          {svg && !t.checked_in_at && (
            <>
              <div className="mx-auto mt-4 w-56 rounded-xl border border-slate-200 p-2 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="Check-in QR code" dangerouslySetInnerHTML={{ __html: svg }} />
              <p className="mt-2 text-body-sm text-on-surface-variant">Show this QR code at the door. Screenshot it or bookmark this page.</p>
            </>
          )}
          {t.status === "waitlist" && <p className="mt-3 text-on-surface-variant">The event is full right now. The organisers will move you up if a spot opens, and this page will show your QR code.</p>}
          {t.status === "cancelled" && t.slug && (
            <Link href={`/e/${t.slug}`} className="btn btn-primary mt-4">
              RSVP again
            </Link>
          )}
        </div>
        {t.status !== "cancelled" && !t.checked_in_at && (
          <div className="no-print flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 p-4">
            <PrintButton />
            <form action={cancelMyRsvp}>
              <input type="hidden" name="code" value={code} />
              <SubmitButton className="btn btn-ghost" pendingText="Cancelling…">
                I can&apos;t make it
              </SubmitButton>
            </form>
          </div>
        )}
      </article>
      {t.slug && (
        <p className="mt-4 text-center">
          <Link href={`/e/${t.slug}`} className="text-label-md text-primary">
            View the event page
          </Link>
        </p>
      )}
    </div>
  );
}
