import Image from "next/image";
import Link from "next/link";
import { categoryImage } from "@/lib/images";
import type { EventSummary } from "@/lib/queries";
import { STATUS_LABEL } from "@/lib/types";
import { fmtDate, money } from "@/lib/format";
import { AvatarStack, Icon, Progress } from "./ui";

const CATEGORY_STYLE: Record<string, { icon: string; box: string }> = {
  "Academic/Tech": { icon: "terminal", box: "bg-primary-fixed text-primary" },
  Social: { icon: "local_cafe", box: "bg-secondary-fixed text-secondary" },
  Career: { icon: "school", box: "bg-tertiary-fixed text-tertiary" },
  Workshop: { icon: "construction", box: "bg-sky-100 text-sky-800" },
  Fundraiser: { icon: "volunteer_activism", box: "bg-emerald-100 text-emerald-800" },
};

export const categoryStyle = (c: string) => CATEGORY_STYLE[c] ?? { icon: "event", box: "bg-surface-container-high text-on-surface-variant" };

export function statusChip(status: EventSummary["status"]) {
  const tone = { draft: "chip-slate", planning: "chip-indigo", locked: "chip-green", completed: "chip-slate" }[status];
  return <span className={`chip ${tone}`}>{STATUS_LABEL[status]}</span>;
}

export function EventCard({ event }: { event: EventSummary }) {
  const tone = event.readiness >= 90 ? "green" : event.readiness < 40 ? "violet" : "primary";
  return (
    <article className="card p-6 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Image src={categoryImage(event.category)} alt="" placeholder="blur" sizes="96px" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {statusChip(event.status)}
              <span className="chip chip-slate">{event.category}</span>
              {event.overdue > 0 && <span className="chip chip-orange">{event.overdue} overdue</span>}
            </div>
            <h3 className="truncate text-headline-sm">
              <Link href={`/events/${event.id}`} className="hover:text-primary">
                {event.title}
              </Link>
            </h3>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-headline-sm">{money(event.budget_total)}</div>
          <div className="text-body-sm text-on-surface-variant">Budget</div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-3 sm:grid-cols-4">
        {[
          ["Date", fmtDate(event.event_date)],
          ["Venue", event.venue ?? "TBD"],
          ["RSVPs", event.capacity ? `${event.rsvp_count} / ${event.capacity}` : String(event.rsvp_count)],
          ["Tasks", `${event.tasksDone} of ${event.tasksTotal} done`],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-body-sm text-on-surface-variant">{k}</dt>
            <dd className="truncate text-label-md font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="min-w-40 flex-1">
          <div className="mb-1 flex justify-between text-label-md">
            <span className="text-on-surface-variant">Readiness</span>
            <span className="font-semibold text-primary">{event.readiness}%</span>
          </div>
          <Progress value={event.readiness} tone={tone} />
        </div>
        <AvatarStack names={event.team.map((m) => m.full_name)} />
        <div className="flex gap-2">
          <Link href={`/events/${event.id}?tab=tasks`} className="btn btn-soft">
            Checklist
          </Link>
          <Link href={`/events/${event.id}`} className="btn btn-primary">
            Open Plan <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      </div>
    </article>
  );
}
