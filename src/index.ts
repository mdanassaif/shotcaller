import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { accounts, projects } from "./db/schema";
import { TOOLS, callTool, catalog, type Ctx } from "./tools";
import { allocate, flags, recommend, type Project } from "./triage";

type Env = { DB: D1Database; ASSETS: Fetcher };
type Vars = { ctx: Ctx };

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// Force HTTPS in production; localhost (wrangler dev) stays on http.
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    url.protocol = "https:";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

/** Fallback only. Clients on the 2026-07-28 spec send their own in MCP-Protocol-Version. */
const PROTOCOL_FALLBACK = "2026-07-28";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolved per request. The new MCP spec is stateless, so there is nothing to keep
 * between calls — the same middleware serves /mcp and /v1.
 */
async function auth(c: any, next: any) {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return c.json({ error: "Missing bearer token" }, 401);
  const db = drizzle(c.env.DB);
  const [account] = await db.select().from(accounts).where(eq(accounts.keyHash, await sha256(token)));
  if (!account) return c.json({ error: "Invalid token" }, 401);
  c.set("ctx", { db, accountId: account.id, weeklyHours: account.weeklyHours });
  await next();
}

/* ------------------------------ signup ------------------------------ */

app.use("/v1/account", cors());

/**
 * Open signup: one click on the board mints an account and returns its token once.
 * Accounts are fully isolated from each other, so an open door only lets someone
 * make their *own* board — the same trust model as the CLI `pnpm key` flow.
 */
app.post("/v1/account", async (c) => {
  const { label } = await c.req.json<{ label?: string }>().catch(() => ({ label: undefined }));
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = "pc_" + btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const db = drizzle(c.env.DB);
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    label: (label || "personal").slice(0, 60),
    keyHash: await sha256(token),
    weeklyHours: 20,
    createdAt: Date.now(),
  });
  return c.json({ token, weeklyHours: 20 });
});

/* ------------------------------- MCP ------------------------------- */

app.post("/mcp", auth, async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const { id, method, params } = body ?? {};
  const ok = (result: unknown) => c.json({ jsonrpc: "2.0", id, result });

  // Notifications carry no id and get no body back.
  if (id === undefined || id === null) return c.body(null, 202);

  switch (method) {
    // Optional under the new spec, still sent by 2025 clients. Answer both.
    case "initialize":
    case "server/discover":
      return ok({
        protocolVersion: params?.protocolVersion ?? c.req.header("MCP-Protocol-Version") ?? PROTOCOL_FALLBACK,
        capabilities: { tools: {} },
        serverInfo: { name: "shotcaller", version: "0.1.0" },
      });

    case "ping":
      return ok({});

    case "tools/list":
      // Seven tools that change almost never; let clients hold the catalog.
      return ok({ tools: catalog(), ttlMs: 300_000, cacheScope: "session" });

    case "tools/call":
      try {
        const text = await callTool(c.get("ctx"), params?.name, params?.arguments ?? {});
        return ok({ content: [{ type: "text", text }] });
      } catch (err: any) {
        // A tool failing is a result the model can read and recover from, not a transport error.
        return ok({ content: [{ type: "text", text: String(err?.message ?? err) }], isError: true });
      }

    default:
      return c.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
});

app.get("/mcp", (c) => c.text("POST only. This server is stateless — there is no stream to open.", 405));

/* ------------------------------- REST ------------------------------- */

app.use("/v1/*", cors());

app.get("/v1/plan", auth, async (c) => {
  const { db, accountId, weeklyHours } = c.get("ctx");
  const rows = (await db.select().from(projects).where(eq(projects.accountId, accountId))) as unknown as Project[];
  // scoresSay comes from triage so the board never re-implements the scoring opinion.
  return c.json({
    weeklyHours,
    projects: allocate(rows, weeklyHours).map((p) => ({ ...p, scoresSay: recommend(p) })),
    flags: flags(rows),
  });
});

// One route per tool, same handlers as MCP. The board and the agent cannot drift apart.
for (const tool of TOOLS) {
  app.post(`/v1/tools/${tool.name}`, auth, async (c) => {
    const args = c.req.header("content-type")?.includes("json") ? await c.req.json().catch(() => ({})) : {};
    try {
      return c.json({ ok: true, result: await callTool(c.get("ctx"), tool.name, args) });
    } catch (err: any) {
      return c.json({ ok: false, error: String(err?.message ?? err) }, 400);
    }
  });
}

app.patch("/v1/settings", auth, async (c) => {
  const { db, accountId } = c.get("ctx");
  const { weeklyHours } = await c.req.json<{ weeklyHours: number }>();
  const hours = Math.min(Math.max(Math.round(weeklyHours), 1), 120);
  await db.update(accounts).set({ weeklyHours: hours }).where(eq(accounts.id, accountId));
  return c.json({ weeklyHours: hours });
});

// Everything else falls through to the static board (web/dist). run_worker_first
// routes all requests here so the https redirect above covers the board too.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
