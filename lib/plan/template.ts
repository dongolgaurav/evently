import type { Plan, PlanInput, PlanMember } from "./types";

type Area = "lead" | "logistics" | "finance" | "marketing" | "hospitality" | "program";

const AREA_WORDS: Record<Area, string[]> = {
  lead: ["president", "chair", "lead organizer", "overall", "director", "captain"],
  logistics: ["logistic", "operation", "venue", "equipment", "av", "tech", "facilit", "setup"],
  finance: ["treasur", "financ", "budget", "sponsor", "fundrais", "grant"],
  marketing: ["market", "social", "outreach", "media", "design", "promo", "communic", "pr"],
  hospitality: ["cater", "food", "hospital", "swag", "volunteer", "member"],
  program: ["program", "speaker", "academic", "workshop", "content", "judg", "mentor", "education"],
};

const AREA_ROLE: Record<Area, string> = {
  lead: "Overall lead: approvals, opening remarks and final calls",
  logistics: "Venue booking, room setup and AV",
  finance: "Budget tracking, funding requests and reimbursements",
  marketing: "Promotion, sign-ups and announcements",
  hospitality: "Food, supplies and day-of volunteers",
  program: "Agenda, speakers and session flow",
};

type TaskSeed = { title: string; detail: string; area: Area; days: number; priority?: boolean };
type Blueprint = {
  split: [string, number][];
  extra: TaskSeed[];
  timeline: [number, string, string, string][]; // [minutes from start, title, detail, location]
  startHour: number;
};

const BLUEPRINTS: Record<string, Blueprint> = {
  "Academic/Tech": {
    split: [["Food & Catering", 40], ["Venue & AV Tech", 25], ["Prizes & Swag", 25], ["Contingency Reserve", 10]],
    extra: [
      { title: "Confirm judges, mentors and judging rubric", detail: "Share the rubric and time commitment with each judge", area: "program", days: 14, priority: true },
      { title: "Request Wi-Fi capacity and power strips", detail: "Estimate one outlet per two attendees; ask campus IT about guest network load", area: "logistics", days: 10 },
      { title: "Order prizes and swag", detail: "Leave shipping time; confirm delivery address on campus", area: "finance", days: 14 },
      { title: "Publish project tracks and rules", detail: "Team size, submission format and deadline", area: "program", days: 12 },
    ],
    startHour: 9,
    timeline: [
      [0, "Setup and sponsor desk arrival", "Tables, power strips, signage and soundcheck", "Main hall"],
      [60, "Doors open and check-in", "Badges and team formation", "Entrance"],
      [120, "Opening and kickoff", "Theme, rules and judging criteria", "Main stage"],
      [240, "Lunch and mentor office hours", "Dietary options labelled", "Hallway"],
      [480, "Project submissions close", "Teams submit links before demos", "Main hall"],
      [510, "Demos and judging", "Three minutes per team", "Main stage"],
      [600, "Awards and clean-up", "Winners announced, room reset", "Main stage"],
    ],
  },
  Social: {
    split: [["Food & Drinks", 55], ["Venue & Setup", 15], ["Decor & Activities", 20], ["Contingency Reserve", 10]],
    extra: [
      { title: "Plan icebreakers and activities", detail: "Two low-pressure activities that work for people arriving alone", area: "program", days: 10 },
      { title: "Build a playlist and test speakers", detail: "Check volume rules for the space", area: "logistics", days: 3 },
      { title: "Buy decor and name tags", detail: "Keep receipts for reimbursement", area: "hospitality", days: 5 },
    ],
    startHour: 17,
    timeline: [
      [0, "Setup", "Tables, decor, music and food stations", "Venue"],
      [45, "Doors open", "Greeters at the entrance with name tags", "Entrance"],
      [75, "Welcome and icebreaker", "Short intro to the club and the team", "Main area"],
      [105, "Food and open social", "Team members circulate and introduce people", "Main area"],
      [165, "Announcements and next events", "Share the sign-up link", "Main area"],
      [180, "Wrap-up and clean-up", "Reset the space and take out rubbish", "Venue"],
    ],
  },
  Career: {
    split: [["Catering & Refreshments", 35], ["Venue & AV Tech", 25], ["Speaker Gifts & Travel", 25], ["Contingency Reserve", 15]],
    extra: [
      { title: "Invite and confirm speakers or employers", detail: "Send date, format, parking and the questions in advance", area: "program", days: 21, priority: true },
      { title: "Prepare moderator questions", detail: "Collect questions from members through the sign-up form", area: "program", days: 7 },
      { title: "Send speaker briefing and thank-you gifts", detail: "Arrival time, room, contact number", area: "lead", days: 3 },
    ],
    startHour: 17,
    timeline: [
      [0, "Setup and AV check", "Microphones, slides and seating", "Room"],
      [30, "Speaker arrival", "Greet guests and walk through the format", "Green room"],
      [45, "Doors open and check-in", "Name tags and seating", "Entrance"],
      [60, "Welcome and introductions", "Club intro and speaker bios", "Main stage"],
      [70, "Panel or talk", "Moderated discussion", "Main stage"],
      [115, "Audience Q&A", "Roving microphone", "Main stage"],
      [135, "Networking", "Refreshments and small-group conversations", "Lobby"],
      [180, "Close and clean-up", "Thank speakers, reset the room", "Room"],
    ],
  },
  Workshop: {
    split: [["Materials & Supplies", 35], ["Food & Refreshments", 30], ["Venue & AV Tech", 20], ["Contingency Reserve", 15]],
    extra: [
      { title: "Draft the session outline and exercises", detail: "One hands-on exercise for every 20 minutes of talking", area: "program", days: 14, priority: true },
      { title: "Send pre-work and setup instructions", detail: "Software to install, accounts to create, what to bring", area: "marketing", days: 4 },
      { title: "Prepare handouts and materials", detail: "Print or share a link; bring spares", area: "hospitality", days: 3 },
    ],
    startHour: 16,
    timeline: [
      [0, "Room setup", "Projector, seating in groups, materials on tables", "Classroom"],
      [30, "Check-in", "Help attendees with setup problems", "Entrance"],
      [45, "Introduction and goals", "What attendees will leave with", "Classroom"],
      [60, "Guided session, part 1", "Instructor-led walkthrough", "Classroom"],
      [105, "Break and refreshments", "", "Hallway"],
      [120, "Hands-on exercise", "Helpers circulate", "Classroom"],
      [165, "Wrap-up and feedback form", "Share resources and next steps", "Classroom"],
    ],
  },
  Fundraiser: {
    split: [["Supplies & Product", 45], ["Marketing & Signage", 20], ["Venue & Permits", 20], ["Contingency Reserve", 15]],
    extra: [
      { title: "Set the fundraising goal and pricing", detail: "Work out the break-even point before buying anything", area: "finance", days: 21, priority: true },
      { title: "Set up cash box and payment QR code", detail: "Follow the club's cash-handling rules; two people count the cash", area: "finance", days: 5 },
      { title: "Schedule table shifts", detail: "Two people per shift, with one treasurer check-in", area: "hospitality", days: 6 },
    ],
    startHour: 10,
    timeline: [
      [0, "Table and signage setup", "Banner, price list, QR code", "Booth"],
      [30, "Sales open", "First shift starts", "Booth"],
      [150, "Shift change and mid-day count", "Record totals so far", "Booth"],
      [270, "Final push", "Post an update on socials", "Booth"],
      [330, "Sales close and cash count", "Two people count and sign", "Booth"],
      [360, "Clean-up and deposit", "Deposit funds per club policy", "Booth"],
    ],
  },
};

const COMMON: TaskSeed[] = [
  { title: "Reserve the venue", detail: "Confirm date, capacity and what equipment is included", area: "logistics", days: 28, priority: true },
  { title: "Register the event with the student activities office", detail: "Check lead times for approval at your campus", area: "lead", days: 28, priority: true },
  { title: "Confirm the budget and submit funding requests", detail: "List every expected cost with a quote", area: "finance", days: 26 },
  { title: "Open the sign-up form", detail: "Collect dietary needs and accessibility requests", area: "marketing", days: 21 },
  { title: "Launch promotion", detail: "Poster, social posts and announcements in class group chats", area: "marketing", days: 14, priority: true },
  { title: "Place the food order", detail: "Use sign-up numbers plus 10%; include vegetarian and allergen-safe options", area: "hospitality", days: 7 },
  { title: "Recruit and brief day-of volunteers", detail: "Assign check-in, setup and clean-up shifts", area: "hospitality", days: 6 },
  { title: "Send a reminder to everyone signed up", detail: "Time, place, what to bring", area: "marketing", days: 2 },
  { title: "Walk through the venue and test AV", detail: "Check microphones, projector, adapters and seating plan", area: "logistics", days: 1, priority: true },
  { title: "Print signage and check-in list", detail: "Directional signs from the nearest entrance", area: "logistics", days: 1 },
  { title: "Run check-in and welcome", detail: "Track attendance for your records", area: "hospitality", days: 0 },
  { title: "Collect receipts and submit reimbursements", detail: "Photograph every receipt on the day", area: "finance", days: -2 },
  { title: "Send thank-yous and a feedback form", detail: "Attendees, speakers, sponsors and volunteers", area: "lead", days: -3 },
];

function memberArea(m: PlanMember): Area | null {
  const text = `${m.focus} ${m.title}`.toLowerCase();
  let best: Area | null = null;
  let bestHits = 0;
  for (const area of Object.keys(AREA_WORDS) as Area[]) {
    const hits = AREA_WORDS[area].filter((w) => new RegExp(`\\b${w}`).test(text)).length;
    if (hits > bestHits) {
      best = area;
      bestHits = hits;
    }
  }
  return best;
}

const hhmm = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Deterministic plan generator. Used as the live preview and when no AI key is configured. */
export function buildTemplatePlan(input: PlanInput): Plan {
  const bp = BLUEPRINTS[input.category] ?? BLUEPRINTS.Social!;
  const members = input.members;
  const areaOf = new Map(members.map((m) => [m.id, memberArea(m)]));
  const load = new Map(members.map((m) => [m.id, 0]));

  const pick = (area: Area): string | null => {
    if (members.length === 0) return null;
    const matches = members.filter((m) => areaOf.get(m.id) === area);
    const pool = matches.length ? matches : members;
    const chosen = pool.reduce((a, b) => (load.get(b.id)! < load.get(a.id)! ? b : a));
    load.set(chosen.id, load.get(chosen.id)! + 1);
    return chosen.id;
  };

  const overnight = /overnight|24|all[- ]night/i.test(`${input.timeWindow} ${input.concept}`);
  const seeds = [...COMMON, ...bp.extra].sort((a, b) => b.days - a.days);
  const phaseDefs: { name: string; subtitle: string; test: (d: number) => boolean }[] = [
    { name: "Phase 1: 4 Weeks Out", subtitle: "Approvals, venue and budget", test: (d) => d >= 15 },
    { name: "Phase 2: 2 Weeks Out", subtitle: "Promotion, purchasing and people", test: (d) => d >= 3 && d < 15 },
    { name: "Phase 3: Final Days & Event Day", subtitle: "Setup, check-in and run of show", test: (d) => d >= 0 && d < 3 },
    { name: "Phase 4: Wrap-Up", subtitle: "Receipts, thank-yous and feedback", test: (d) => d < 0 },
  ];
  const phases = phaseDefs.map((p) => ({
    name: p.name,
    subtitle: p.subtitle,
    tasks: seeds
      .filter((s) => p.test(s.days))
      .map((s) => ({
        title: s.title,
        detail: s.detail,
        assignee_id: pick(s.area),
        days_before: s.days,
        priority: Boolean(s.priority),
      })),
  }));

  const total = Math.max(0, Math.round(input.budget));
  let left = total;
  const budget = bp.split.map(([category, share], i) => {
    const amount = i === bp.split.length - 1 ? left : Math.round((total * share) / 100 / 5) * 5;
    left -= amount;
    return { category, amount: Math.max(0, amount) };
  });

  const start = bp.startHour * 60;
  const timeline = bp.timeline.map(([offset, title, detail, location]) => ({
    time: hhmm(start + offset),
    title,
    detail,
    location: location === "Venue" || location === "Room" ? input.venue || location : location,
  }));
  if (overnight) {
    timeline.push(
      { time: "00:00", title: "Midnight food and energy break", detail: "Quiet room stays open for anyone who needs rest", location: input.venue || "Main hall" },
      { time: "07:30", title: "Breakfast and final stretch", detail: "Remind teams of the closing deadline", location: input.venue || "Main hall" },
    );
  }

  const usedAreas = new Set<Area>();
  const roles = members.map((m) => {
    const area = areaOf.get(m.id);
    if (area) usedAreas.add(area);
    return {
      member_id: m.id,
      responsibility: m.focus.trim() ? `${m.focus.trim()}${area ? ` — ${AREA_ROLE[area].toLowerCase()}` : ""}` : area ? AREA_ROLE[area] : "General support across the checklist",
    };
  });

  const compliance = [
    { title: "Room reservation confirmed in writing", detail: "Keep the confirmation email with the booking reference", reference: "Facilities" },
    { title: "Event registered and approved", detail: "Most campuses require registration before you can advertise", reference: "Student activities office" },
    { title: "Food service approval", detail: "Needed on many campuses when serving outside or home-made food", reference: "Campus dining / health & safety" },
  ];
  if (overnight) compliance.push({ title: "After-hours building access approved", detail: "Names of responsible students and a staff contact", reference: "Campus security" });
  if (input.attendees >= 100) compliance.push({ title: "Room capacity and fire-exit plan checked", detail: `Expected attendance of ${input.attendees} is within the posted room capacity`, reference: "Facilities / fire safety" });
  if (input.category === "Fundraiser") compliance.push({ title: "Cash-handling and sales approval", detail: "Follow your club's rules for collecting and depositing money", reference: "Student organisation finance office" });

  const gaps = (["logistics", "finance", "marketing"] as Area[]).filter((a) => !usedAreas.has(a));
  const summary =
    `${phases.reduce((n, p) => n + p.tasks.length, 0)} tasks across ${phases.length} phases for ${input.attendees || "your"} attendees, ` +
    `with ${total ? `$${total.toLocaleString("en-US")} split across ${budget.length} budget lines` : "no budget set yet"}. ` +
    (members.length === 0
      ? "No team members were selected, so tasks are unassigned."
      : gaps.length
        ? `Nobody on the team is clearly covering ${gaps.join(" or ")}, so those tasks were spread across everyone.`
        : "Each area has an owner; check the dates against your campus's approval lead times.");

  return { summary, roles, budget, phases, timeline, compliance };
}
