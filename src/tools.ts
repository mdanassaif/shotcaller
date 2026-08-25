import { eq, desc } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/d1";
import { accounts, projects, signals } from "./db/schema";
import { BAYS, WORDS, FOCUS_CAP, allocate, flags, recommend, reason, type Bay, type Project } from "./triage";

export interface Ctx {
  db: ReturnType<typeof drizzle>;
  accountId: string;
  weeklyHours: number;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (ctx: Ctx, args: any) => Promise<string>;
}

const dial = (k: keyof typeof WORDS) => ({
  type: "integer",
  minimum: 1,
  maximum: 5,
  description: WORDS[k].map((w, i) => `${i + 1} ${w}`).join(", "),
});

const obj = (properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "object", properties, ...(required.length ? { required } : {}) });

const all = (ctx: Ctx) => ctx.db.select().from(projects).where(eq(projects.accountId, ctx.accountId));

async function resolve(ctx: Ctx, ref: string) {
  if (!ref) throw new Error("Which project? Pass a name or id.");
  const rows = await all(ctx);
  const hit =
    rows.find((r) => r.id === ref) ??
    rows.find((r) => r.name.toLowerCase() === ref.toLowerCase()) ??
    rows.find((r) => r.name.toLowerCase().includes(ref.toLowerCase()));
  if (!hit) throw new Error(`No project matches "${ref}". On the board: ${rows.map((r) => r.name).join(", ") || "none yet"}.`);
  return hit;
}

const clamp = (n: unknown, fallback: number) =>
  typeof n === "number" && n >= 1 && n <= 5 ? Math.round(n) : fallback;

const asBay = (v: unknown): Bay => {
  if (typeof v === "string" && v in BAYS) return v as Bay;
  throw new Error(`bay must be one of: ${Object.keys(BAYS).join(", ")}`);
};

/* ------------------------------ tools ------------------------------ */

export const TOOLS: Tool[] = [
  {
    name: "weekly_plan",
    description:
      "The answer to 'what should I work on'. Every project by bay, the hours it gets this week, " +
      "what to deliberately ignore, and where the board is lying to itself. " +
      "Call this at the start of a session before picking up project work.",
    inputSchema: obj({}),
    async run(ctx) {
      const rows = (await all(ctx)) as unknown as Project[];
      if (!rows.length) return "Board is empty. Add projects with upsert_project, then score them.";

      const withHours = allocate(rows, ctx.weeklyHours);
      const out: string[] = [`${ctx.weeklyHours}h this week across ${rows.length} projects.`, ""];
      for (const bay of Object.keys(BAYS) as Bay[]) {
        const inBay = withHours.filter((p) => p.bay === bay);
        if (!inBay.length) continue;
        out.push(`${BAYS[bay].name.toUpperCase()} — ${BAYS[bay].why}`);
        for (const p of inBay) out.push(`  ${p.name} — ${p.hours}h${p.hours === 0 ? " (do nothing)" : ""}`);
        out.push("");
      }
      out.push("Watch out:");
      for (const f of flags(rows)) out.push(`  - ${f}`);
      return out.join("\n");
    },
  },

  {
    name: "list_projects",
    description: "Raw board state with scores, and what the scores say versus where the project actually sits.",
    inputSchema: obj({ bay: { type: "string", enum: Object.keys(BAYS) } }),
    async run(ctx, args) {
      const rows = await all(ctx);
      const filtered = args.bay ? rows.filter((r) => r.bay === args.bay) : rows;
      return JSON.stringify(
        allocate(filtered as unknown as Project[], ctx.weeklyHours).map((p: any) => ({
          id: p.id,
          name: p.name,
          bay: p.bay,
          pinned: p.pinned,
          hours: p.hours,
          scores: { pull: p.pull, upside: p.upside, drag: p.drag, spark: p.spark },
          scoresSay: recommend(p),
          note: p.note ?? undefined,
        })),
        null,
        2
      );
    },
  },

  {
    name: "upsert_project",
    description: "Create a project, or update its name, url, or note. Matches on name when no id is given.",
    inputSchema: obj(
      {
        id: { type: "string" },
        name: { type: "string" },
        url: { type: "string" },
        note: { type: "string", description: "One line of context: what it is and where it stands." },
      },
      ["name"]
    ),
    async run(ctx, args) {
      if (!args.name) throw new Error("name is required.");
      const now = Date.now();
      const rows = await all(ctx);
      const existing = args.id
        ? rows.find((r) => r.id === args.id)
        : rows.find((r) => r.name.toLowerCase() === String(args.name).toLowerCase());

      if (existing) {
        await ctx.db
          .update(projects)
          .set({
            name: args.name ?? existing.name,
            url: args.url ?? existing.url,
            note: args.note ?? existing.note,
            updatedAt: now,
          })
          .where(eq(projects.id, existing.id));
        return `Updated ${args.name ?? existing.name}.`;
      }

      await ctx.db.insert(projects).values({
        id: crypto.randomUUID(),
        accountId: ctx.accountId,
        name: args.name,
        url: args.url ?? null,
        note: args.note ?? null,
        pull: 3, upside: 3, drag: 3, spark: 3,
        bay: "fix", pinned: false,
        lastTouchedAt: now, createdAt: now, updatedAt: now,
      });
      return `Added ${args.name}, unscored, sitting in fix or decide. Call score_project to file it properly.`;
    },
  },

  {
    name: "score_project",
    description:
      "Answer the four questions and let the board file the project. Omitted dials keep their current value. " +
      "If you have no basis for a score, call with only `project` and the tool will ask rather than let you guess.",
    inputSchema: obj(
      {
        project: { type: "string", description: "Project id or name." },
        pull: dial("pull"),
        upside: dial("upside"),
        drag: dial("drag"),
        spark: dial("spark"),
      },
      ["project"]
    ),
    async run(ctx, args) {
      const p = await resolve(ctx, args.project);
      const keys = ["pull", "upside", "drag", "spark"] as const;

      if (keys.every((k) => args[k] === undefined)) {
        return (
          `No scores supplied, so nothing changed. Ask the human these four about ${p.name}, then call again:\n` +
          keys.map((k) => `  ${k}: ${WORDS[k].map((w, i) => `${i + 1} ${w}`).join(" / ")}`).join("\n") +
          `\nCurrently ${keys.map((k) => `${k} ${p[k]}`).join(", ")}.`
        );
      }

      const next = {
        pull: clamp(args.pull, p.pull),
        upside: clamp(args.upside, p.upside),
        drag: clamp(args.drag, p.drag),
        spark: clamp(args.spark, p.spark),
      };
      const bay: Bay = p.pinned ? (p.bay as Bay) : recommend(next);
      const now = Date.now();
      await ctx.db.update(projects).set({ ...next, bay, lastTouchedAt: now, updatedAt: now }).where(eq(projects.id, p.id));

      const said = keys.map((k) => `${k} ${WORDS[k][next[k] - 1]}`).join(", ");
      return p.pinned
        ? `${p.name}: ${said}. Stays in ${BAYS[p.bay as Bay].name.toLowerCase()} because it is pinned; the scores say ${BAYS[recommend(next)].name.toLowerCase()}.`
        : `${p.name}: ${said}. Filed under ${BAYS[bay].name.toLowerCase()}. ${reason(next)}`;
    },
  },

  {
    name: "move_project",
    description:
      `Place a project in a bay by hand and pin it there, overriding the scores. ` +
      `Pass pinned=false to release it back to scoring. Focus holds ${FOCUS_CAP}; this warns rather than blocks.`,
    inputSchema: obj(
      {
        project: { type: "string" },
        bay: { type: "string", enum: Object.keys(BAYS) },
        pinned: { type: "boolean", default: true },
      },
      ["project", "bay"]
    ),
    async run(ctx, args) {
      const p = await resolve(ctx, args.project);
      const pinned = args.pinned !== false;
      const bay: Bay = pinned ? asBay(args.bay) : recommend(p as any);
      await ctx.db.update(projects).set({ bay, pinned, updatedAt: Date.now() }).where(eq(projects.id, p.id));

      const focusCount = (await all(ctx)).filter((r) => r.bay === "focus").length;
      const warn = focusCount > FOCUS_CAP ? ` Focus now holds ${focusCount}; past ${FOCUS_CAP} they all slow down.` : "";
      return pinned
        ? `${p.name} pinned to ${BAYS[bay].name.toLowerCase()}.${warn}`
        : `${p.name} unpinned and refiled under ${BAYS[bay].name.toLowerCase()}.`;
    },
  },

  {
    name: "log_signal",
    description:
      "Record something that happened to a project — shipped, revenue, traffic, hours spent, an incident. " +
      "Cheap to call and worth calling often: it is what makes a stale focus project visible later.",
    inputSchema: obj(
      {
        project: { type: "string" },
        kind: { type: "string", enum: ["shipped", "revenue", "traffic", "hours", "incident", "note"] },
        value: { type: "number", description: "Optional number — rupees, visits, hours." },
        note: { type: "string" },
      },
      ["project", "kind"]
    ),
    async run(ctx, args) {
      const p = await resolve(ctx, args.project);
      const kinds = ["shipped", "revenue", "traffic", "hours", "incident", "note"];
      if (!kinds.includes(args.kind)) throw new Error(`kind must be one of: ${kinds.join(", ")}`);
      const now = Date.now();
      await ctx.db.insert(signals).values({
        id: crypto.randomUUID(),
        projectId: p.id,
        kind: args.kind,
        value: typeof args.value === "number" ? Math.round(args.value) : null,
        note: args.note ?? null,
        at: now,
      });
      await ctx.db.update(projects).set({ lastTouchedAt: now }).where(eq(projects.id, p.id));
      return `Logged ${args.kind} on ${p.name}.`;
    },
  },

  {
    name: "set_capacity",
    description:
      "Set the weekly hours budget the plan splits across bays (1–120). " +
      "Use when the human says their week changed — fewer hours, a heavy week, a holiday.",
    inputSchema: obj({ weeklyHours: { type: "integer", minimum: 1, maximum: 120 } }, ["weeklyHours"]),
    async run(ctx, args) {
      const n = Number(args.weeklyHours);
      if (!Number.isFinite(n)) throw new Error("weeklyHours must be a number between 1 and 120.");
      const hours = Math.min(Math.max(Math.round(n), 1), 120);
      await ctx.db.update(accounts).set({ weeklyHours: hours }).where(eq(accounts.id, ctx.accountId));
      return `Capacity set to ${hours}h a week. Call weekly_plan for the new split.`;
    },
  },

  {
    name: "project_history",
    description: "Recent signals for one project, newest first. Read it before re-scoring so the score reflects reality.",
    inputSchema: obj({ project: { type: "string" }, limit: { type: "integer", maximum: 100 } }, ["project"]),
    async run(ctx, args) {
      const p = await resolve(ctx, args.project);
      const limit = Math.min(Number(args.limit) || 20, 100);
      const rows = await ctx.db
        .select().from(signals)
        .where(eq(signals.projectId, p.id))
        .orderBy(desc(signals.at))
        .limit(limit);
      if (!rows.length) return `Nothing logged against ${p.name} yet.`;
      return rows
        .map((s) => `${new Date(s.at).toISOString().slice(0, 10)}  ${s.kind}${s.value != null ? ` ${s.value}` : ""}${s.note ? ` — ${s.note}` : ""}`)
        .join("\n");
    },
  },
];

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

export async function callTool(ctx: Ctx, name: string, args: any = {}): Promise<string> {
  const tool = TOOL_MAP.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}. Available: ${TOOLS.map((t) => t.name).join(", ")}`);
  return tool.run(ctx, args ?? {});
}

/** What tools/list returns — the handlers stay on this side of the wire. */
export const catalog = () =>
  TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
