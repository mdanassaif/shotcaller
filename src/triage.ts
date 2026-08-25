/**
 * The whole opinion of the product lives here.
 * Both the REST API and the MCP tools call these — the board and the agent
 * can never disagree about where a project belongs.
 */

export type Bay = "focus" | "fix" | "autopilot" | "cut";

export const BAYS: Record<Bay, { name: string; why: string; weight: number }> = {
  focus:     { name: "Focus",         why: "Real upside, you still want it. Two, maximum.", weight: 3 },
  fix:       { name: "Fix or decide", why: "Needs one call, not another quarter of drift.",  weight: 1.4 },
  autopilot: { name: "Autopilot",     why: "Runs without you. Check it monthly.",            weight: 0.35 },
  cut:       { name: "Cut",           why: "Archive it, sell it, or let it lapse.",          weight: 0 },
};

export const FOCUS_CAP = 2;

export interface Scored {
  pull: number;    // 1 dead flat  → 5 taking off
  upside: number;  // 1 tiny       → 5 huge
  drag: number;    // 1 none       → 5 relentless
  spark: number;   // 1 dreading   → 5 can't wait
}

export const WORDS: Record<keyof Scored, string[]> = {
  pull:   ["dead flat", "a trickle", "steady", "growing", "taking off"],
  upside: ["tiny", "small", "decent", "big", "huge"],
  drag:   ["none", "light", "weekly", "constant", "relentless"],
  spark:  ["dreading it", "meh", "fine", "keen", "can't wait"],
};

export function recommend(s: Scored): Bay {
  const { pull, upside, drag, spark } = s;
  if (spark <= 2 && pull <= 2) return "cut";
  if (drag >= 4 && pull <= 2 && upside <= 3) return "cut";
  if (pull >= 3 && drag <= 2) return "autopilot";
  if (upside >= 4 && spark >= 4 && drag <= 4) return "focus";
  if (pull >= 4 && upside >= 4) return "focus";
  return "fix";
}

export function reason(s: Scored): string {
  switch (recommend(s)) {
    case "cut":       return "Low pull, low spark. It costs more than it returns.";
    case "autopilot": return "Moves on its own and barely asks for upkeep. Leave it running.";
    case "focus":     return "Big upside, you still want it, drag is survivable.";
    default:          return "Mixed signals. One decision will settle it.";
  }
}

export interface Allocatable { id: string; name: string; bay: Bay }

/**
 * Splits the week by bay weight, not by how guilty each project makes you feel.
 * Rounds by largest remainder so the parts sum to exactly weeklyHours — rounding
 * each share independently drifts, and a plan that claims 20h while handing out
 * 20.1 is the kind of small lie that makes people stop trusting the number.
 */
export function allocate<T extends Allocatable>(projects: T[], weeklyHours: number) {
  const total = projects.reduce((sum, p) => sum + BAYS[p.bay].weight, 0);
  if (total <= 0) return projects.map((p) => ({ ...p, hours: 0 }));

  const exact = projects.map((p) => (BAYS[p.bay].weight / total) * weeklyHours);
  const tenths = exact.map((h) => Math.floor(h * 10));
  let short = Math.round(weeklyHours * 10) - tenths.reduce((a, b) => a + b, 0);

  // Hand the leftover tenths to the largest remainders first.
  const order = exact
    .map((h, i) => ({ i, rem: h * 10 - Math.floor(h * 10) }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; short > 0 && k < order.length; k++, short--) tenths[order[k].i]++;

  return projects.map((p, i) => ({ ...p, hours: tenths[i] / 10 }));
}

export type Project = Allocatable & Scored & { pinned: boolean; lastTouchedAt?: number | null };

/** The nagging. Returns plain sentences an agent can read out loud. */
export function flags(projects: Project[], now = Date.now()): string[] {
  const out: string[] = [];
  const focus = projects.filter((p) => p.bay === "focus");

  if (focus.length > FOCUS_CAP) {
    out.push(
      `Focus holds ${focus.length}. Past ${FOCUS_CAP}, all of them slow down. Demote one: ` +
        focus.map((p) => p.name).join(", ") + "."
    );
  }
  for (const p of projects) {
    if (p.bay === "autopilot" && p.drag >= 4) {
      out.push(`${p.name} sits in autopilot with ${WORDS.drag[p.drag - 1]} upkeep. That is unpaid maintenance, not autopilot.`);
    }
    if (p.bay === "focus" && p.spark <= 2) {
      out.push(`${p.name} is in focus and you are ${WORDS.spark[p.spark - 1]}. Focus runs on wanting to.`);
    }
    if (p.pinned && p.bay !== recommend(p)) {
      out.push(`${p.name} is pinned to ${BAYS[p.bay].name.toLowerCase()}; the scores say ${BAYS[recommend(p)].name.toLowerCase()}.`);
    }
    const stale = p.lastTouchedAt ? (now - p.lastTouchedAt) / 86_400_000 : null;
    if (p.bay === "focus" && stale !== null && stale > 10) {
      out.push(`${p.name} is in focus but nothing has been logged against it in ${Math.round(stale)} days.`);
    }
  }
  if (!projects.length) return ["Nothing on the board yet. Add a project and score it."];
  if (projects.every((p) => p.bay === "cut")) return ["Everything is cut. Nothing here is asking for your week."];
  if (!focus.length && projects.some((p) => p.bay !== "cut")) {
    out.push("Nothing is in focus. The week will go somewhere — decide where, or it decides for you.");
  }
  if (!out.length) {
    const n = focus.length;
    out.push(`Board is clean. ${n === 1 ? "One thing gets" : `${n} things get`} the week, the rest get left alone.`);
  }
  return out;
}
