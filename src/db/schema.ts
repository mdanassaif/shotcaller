import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  /** sha-256 of the bearer token. The token itself is never stored. */
  keyHash: text("key_hash").notNull(),
  weeklyHours: integer("weekly_hours").notNull().default(20),
  createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull().references(() => accounts.id),
    name: text("name").notNull(),
    url: text("url"),
    note: text("note"),

    pull: integer("pull").notNull().default(3),
    upside: integer("upside").notNull().default(3),
    drag: integer("drag").notNull().default(3),
    spark: integer("spark").notNull().default(3),

    bay: text("bay", { enum: ["focus", "fix", "autopilot", "cut"] }).notNull().default("fix"),
    /** true = placed by hand; scores stop moving it */
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),

    lastTouchedAt: integer("last_touched_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({ byAccount: index("projects_account_idx").on(t.accountId) })
);

/** Anything that happened. This is what makes drift visible later. */
export const signals = sqliteTable(
  "signals",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    kind: text("kind", { enum: ["shipped", "revenue", "traffic", "hours", "incident", "note"] }).notNull(),
    value: integer("value"),
    note: text("note"),
    at: integer("at").notNull(),
  },
  (t) => ({ byProject: index("signals_project_idx").on(t.projectId, t.at) })
);
