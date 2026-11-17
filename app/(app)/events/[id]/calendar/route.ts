import { loadEvent } from "@/lib/event-data";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const day = (iso: string) => iso.replaceAll("-", "");
const nextDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
};

// Downloads the event and its open task deadlines as an .ics calendar file.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { event, tasks, memberById } = await loadEvent((await params).id);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Evently//Event Plan//EN", "CALSCALE:GREGORIAN"];
  const add = (uid: string, date: string, summary: string, description: string, location?: string | null) =>
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@evently`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(description)}`,
      ...(location ? [`LOCATION:${esc(location)}`] : []),
      "END:VEVENT",
    );
  if (event.event_date) add(event.id, event.event_date, event.title, [event.time_window, event.concept].filter(Boolean).join(" — "), event.venue);
  for (const t of tasks) {
    if (t.done || !t.due_date) continue;
    const who = t.assignee_id ? memberById.get(t.assignee_id)?.full_name : null;
    add(t.id, t.due_date, `Due: ${t.title}`, [event.title, who ? `Owner: ${who}` : null, t.detail].filter(Boolean).join(" — "));
  }
  lines.push("END:VCALENDAR");
  const name = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.ics"` },
  });
}
