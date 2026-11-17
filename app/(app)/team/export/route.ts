import { getContext } from "@/lib/data";
import { TIER_LABEL, type Member, type Task } from "@/lib/types";

// Spreadsheet apps treat cells starting with = + - @ as formulas; prefix them so they stay text.
const cell = (v: string | number | null | undefined) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const { supabase, club } = await getContext();
  const [members, tasks] = await Promise.all([
    supabase.from("members").select("*").eq("club_id", club.id).order("created_at"),
    supabase.from("tasks").select("assignee_id, done").eq("club_id", club.id).eq("kind", "task"),
  ]);
  const rows = [["Name", "Role", "Group", "Email", "Year", "Major", "Open tasks", "Completed tasks", "Has account"]];
  for (const m of (members.data ?? []) as Member[]) {
    const mine = ((tasks.data ?? []) as Pick<Task, "assignee_id" | "done">[]).filter((t) => t.assignee_id === m.id);
    rows.push([
      m.full_name, m.title ?? "", TIER_LABEL[m.tier], m.email ?? "", m.year ?? "", m.major ?? "",
      String(mine.filter((t) => !t.done).length), String(mine.filter((t) => t.done).length), m.user_id ? "Yes" : "No",
    ]);
  }
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="roster.csv"' },
  });
}
