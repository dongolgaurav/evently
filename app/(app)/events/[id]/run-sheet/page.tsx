import Link from "next/link";
import { loadEvent } from "@/lib/event-data";
import { fmtTime, fmtWeekday } from "@/lib/format";
import { PrintButton } from "@/components/client";
import { Icon } from "@/components/ui";

export const metadata = { title: "Run sheet" };

export default async function RunSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { ctx, event, timeline, roles, tasks, memberById } = await loadEvent((await params).id);
  const dayOf = tasks.filter((t) => !t.done && t.kind === "task" && t.due_date === event.event_date);
  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/events/${event.id}?tab=run`} className="flex items-center gap-1 text-label-md text-primary">
          <Icon name="arrow_back" className="text-[18px]" /> Back to event
        </Link>
        <PrintButton />
      </div>
      <article className="card p-8 print:shadow-none">
        <p className="text-label-sm tracking-wider text-on-surface-variant uppercase">{ctx.club.name} • Run sheet</p>
        <h1 className="text-headline-lg">{event.title}</h1>
        <p className="mt-1 text-on-surface-variant">
          {fmtWeekday(event.event_date)}
          {event.time_window ? ` • ${event.time_window}` : ""}
          {event.venue ? ` • ${event.venue}` : ""}
        </p>

        <h2 className="mt-8 mb-3 text-headline-sm">Schedule</h2>
        <table className="w-full text-left">
          <tbody>
            {timeline.map((t) => (
              <tr key={t.id} className="border-t border-slate-200 align-top">
                <td className="w-24 py-2 font-bold whitespace-nowrap text-primary">{fmtTime(t.start_time)}</td>
                <td className="py-2">
                  <div className="font-semibold">{t.title}</div>
                  {t.detail && <div className="text-body-sm text-on-surface-variant">{t.detail}</div>}
                </td>
                <td className="w-36 py-2 text-right text-body-sm">{t.location}</td>
              </tr>
            ))}
            {timeline.length === 0 && (
              <tr>
                <td className="py-2 text-on-surface-variant">No timeslots have been added yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="mt-8 mb-3 text-headline-sm">Who owns what</h2>
        <ul className="space-y-1">
          {roles.map((r) => (
            <li key={r.id}>
              <b>{memberById.get(r.member_id)?.full_name ?? "Former member"}</b> — {r.responsibility}
            </li>
          ))}
          {roles.length === 0 && <li className="text-on-surface-variant">No roles assigned.</li>}
        </ul>

        {dayOf.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-headline-sm">Day-of tasks</h2>
            <ul className="space-y-1">
              {dayOf.map((t) => (
                <li key={t.id} className="flex gap-2">
                  <span className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rounded border border-slate-400" />
                  <span>
                    {t.title}
                    {t.assignee_id && memberById.get(t.assignee_id) ? ` (${memberById.get(t.assignee_id)!.full_name})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </div>
  );
}
