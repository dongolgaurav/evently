import Link from "next/link";
import { getContext } from "@/lib/data";
import { loadClubData } from "@/lib/queries";
import { dueLabel, todayISO } from "@/lib/format";
import { EmptyState, Icon, PageHeader } from "@/components/ui";
import { EventCard } from "@/components/event-card";

export const metadata = { title: "My Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const searching = sp.q !== undefined;
  const { events, tasks, memberById } = await loadClubData(ctx);
  const show = sp.show === "past" ? "past" : "active";
  const eventById = new Map(events.map((e) => [e.id, e]));
  const today = todayISO();

  const visible = events.filter((e) =>
    searching
      ? !q || [e.title, e.venue, e.category, e.concept].some((v) => v?.toLowerCase().includes(q))
      : show === "past"
        ? e.status === "completed"
        : e.status !== "completed",
  );
  const matchedTasks = searching
    ? tasks
        .filter((t) => !t.done && (!q || `${t.title} ${t.detail ?? ""} ${(t.assignee_id && memberById.get(t.assignee_id)?.full_name) || ""}`.toLowerCase().includes(q)))
        .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
        .slice(0, 40)
    : [];

  return (
    <>
      <PageHeader
        title={searching ? (q ? `Results for “${sp.q}”` : "All action items") : "My Events"}
        subtitle={searching ? `${visible.length} event${visible.length === 1 ? "" : "s"} and ${matchedTasks.length} open task${matchedTasks.length === 1 ? "" : "s"}` : "Every event your club is planning, with its readiness and budget."}
      >
        {searching ? (
          <Link href="/events" className="btn btn-soft">
            Clear search
          </Link>
        ) : (
          <div className="flex rounded-xl bg-surface-container p-1">
            {(["active", "past"] as const).map((v) => (
              <Link key={v} href={`/events?show=${v}`} className={`rounded-lg px-3 py-1 text-label-md capitalize ${show === v ? "bg-white font-semibold shadow-sm" : "text-on-surface-variant"}`}>
                {v}
              </Link>
            ))}
          </div>
        )}
        <Link href="/planner" className="btn btn-primary">
          <Icon name="add" className="text-[18px]" /> Plan New Event
        </Link>
      </PageHeader>

      {visible.length === 0 && matchedTasks.length === 0 ? (
        <EmptyState
          icon={searching ? "search_off" : "event"}
          title={searching ? "Nothing matches that search" : show === "past" ? "No completed events yet" : "No events on the calendar yet"}
          body={searching ? "Try a different word, or browse all events." : "Let's plan something great."}
        >
          <Link href={searching ? "/events" : "/planner"} className="btn btn-primary">
            {searching ? "Browse all events" : "Plan an event"}
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className={`space-y-4 ${matchedTasks.length ? "xl:col-span-2" : "xl:col-span-3"}`}>
            {visible.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
          {matchedTasks.length > 0 && (
            <section className="card h-fit p-6">
              <h2 className="mb-4 text-headline-sm">Open tasks</h2>
              <ul className="space-y-3">
                {matchedTasks.map((t) => (
                  <li key={t.id} className="rounded-xl bg-surface-container-low p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/events/${t.event_id}?tab=tasks`} className="text-label-md font-semibold hover:text-primary">
                        {t.title}
                      </Link>
                      <span className={`chip ${t.due_date && t.due_date < today ? "chip-red" : "chip-slate"}`}>{dueLabel(t.due_date)}</span>
                    </div>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {eventById.get(t.event_id)?.title} • {t.assignee_id ? (memberById.get(t.assignee_id)?.full_name ?? "Unassigned") : "Unassigned"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
