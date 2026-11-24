import { loadEvent } from "@/lib/event-data";

const cell = (v: string | null | undefined) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

// Guest list as CSV, for sign-in sheets and attendance records.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { event, rsvps } = await loadEvent((await params).id);
  const rows = [["Name", "Email", "Status", "Checked in", "Signed up", "Source"]];
  for (const r of rsvps) rows.push([r.name, r.email, r.status, r.checked_in_at ?? "", r.created_at, r.source]);
  const name = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-guests.csv"` },
  });
}
