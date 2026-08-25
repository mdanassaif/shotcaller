# Shotcaller

*The one who calls the shots on your week.* Repo: `shotcaller-mcp`. Formerly "Portfolio Control".

Eight MCP tools that decide which of your projects get the week, and which get left alone.
Hono on Cloudflare Workers, Drizzle over D1. MCP at `POST /mcp`, REST at `/v1`, and a
web board at `/` — a React + shadcn/ui app (`web/`, Vite + Tailwind v4) served as
Workers static assets. Score a project on four dials and the board files it into a bay
(Focus / Fix or decide / Autopilot / Cut), splits your weekly hours, drags-and-drops,
and calls out where the board is lying to itself. The board only calls `/v1`, which
shares handlers with `/mcp` — the human view and the agent view can never disagree.

Works from any MCP client: the ⚡ connect dialog has ready-made setup for Claude Code,
Cursor, and Codex. One click on the board mints an isolated account; one token is all
an agent needs.

## Setup

```bash
pnpm install
wrangler d1 create portfolio          # paste the id into wrangler.json
pnpm db:init                          # applies migrations/0001_init.sql locally
pnpm dev
```

Open http://localhost:8787 and click **Start my board** — that mints an account and
keeps its token in the browser. The ⚡ Connect Claude button shows the token and the
ready-made `claude mcp add` command whenever you need them.

Prefer the CLI? `pnpm key "personal"` still prints a token, the SQL to insert it, and
a `/?key=…` link that signs the browser in without typing.

Check it:

```bash
curl -s localhost:8787/v1/tools/weekly_plan -X POST \
  -H "authorization: Bearer pc_..." -H "content-type: application/json" -d '{}'
```

Connect Claude Code:

```bash
claude mcp add --transport http portfolio http://localhost:8787/mcp \
  --header "Authorization: Bearer pc_..."
```

Deploy with `pnpm deploy`, then `pnpm db:init:remote` and re-insert your account row
with `--remote`.

## The tools

| Tool | What it's for |
| --- | --- |
| `weekly_plan` | The one that matters. Every project by bay, its hours this week, what to ignore, and where the board is lying to itself. |
| `list_projects` | Raw state — scores, and what the scores say versus where the project sits. |
| `upsert_project` | Add or edit. |
| `score_project` | Four dials; the board files it. Called with no dials, it asks instead of guessing. |
| `move_project` | Place by hand and pin, overriding the scores. |
| `log_signal` | shipped / revenue / traffic / hours / incident. Cheap, call it often. |
| `set_capacity` | Set the weekly hours budget (1–120) when the week changes. |
| `project_history` | Recent signals, so a re-score reflects reality. |

Scoring rules live in `src/triage.ts` and nowhere else. `/mcp` and `/v1` call the same
handlers in `src/tools.ts`, so the two surfaces can't drift apart.

## How the week gets split

Focus counts 3, fix 1.4, autopilot 0.35, cut 0. Shares round by largest remainder so
they sum to exactly your capacity. Cut always gets zero.

Note the shape this produces: one project in focus plus a couple on autopilot gives
focus about 90% of the week. That is the intended opinion — if one thing matters, it
gets the week — but it is a number to sit with before trusting it. The weights are in
`BAYS` if you disagree.

## What was tested

- All 625 score combinations route to a real bay; none fall through.
- Hours sum to capacity from 1h to 120h (error ~1e-14, float noise).
- Empty board, all-cut board, and no-focus board each get their own message instead of
  claiming the board is clean.
- Every tool end-to-end over `POST /mcp` against real SQLite: add, score, partial score,
  pin, unpin, signals, history.
- `/v1/tools/weekly_plan` returns output identical to the MCP call.
- Failure paths: missing token 401, bad token 401, unknown project, unknown tool, bad
  enum values, notifications 202, unknown method -32601, `GET /mcp` 405.
- `tsc --noEmit` clean under `strict` against real hono and drizzle-orm.

Two bugs surfaced and were fixed: per-project rounding made the hours sum to 20.1 on a
20h week, and an empty board reported itself clean.

Not tested: an actual `wrangler dev` boot or a real D1 binding. The tests ran the Worker
under Node with a SQLite-backed D1 shim, so your first `pnpm dev` is still the first
real one.

## Deliberately left out

- **OAuth.** The 2026-07-28 spec prefers CIMD and deprecates Dynamic Client Registration
  (removal after summer 2027); `@cloudflare/workers-oauth-provider` implements it. Worth
  adding the day a second person needs an account, not before.
- **The MCP SDK.** `createMcpHandler` is the right long-term home. The handler here is
  hand-rolled JSON-RPC, which is only reasonable *because* the new spec is stateless —
  no session store, no `Mcp-Session-Id`, no stream to hold open. It answers `initialize`
  and `server/discover` both, so 2025 clients still connect.
- **MRTR elicitation.** `score_project` with no dials returns text asking the four
  questions. The protocol-level version returns an `input_required` result the client
  renders as a form. Nicer; needs the SDK.
- **Weekly snapshots.** Only worth it for a decay-over-months view.
- **Wiring the HTML board to this.** The board still uses browser storage. Point it at
  `/v1/tools/*` when you want them sharing one database.

## Before building any of that

Use it for two weeks. The open question isn't whether it works — it does — it's whether
you reach for `weekly_plan` on a Monday or forget it exists. Everything above only pays
off if the answer is yes.
