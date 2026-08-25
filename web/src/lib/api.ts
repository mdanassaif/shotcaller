export type Bay = "focus" | "fix" | "autopilot" | "cut";

export interface Project {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  pull: number;
  upside: number;
  drag: number;
  spark: number;
  bay: Bay;
  pinned: boolean;
  hours: number;
  scoresSay: Bay;
}

export interface Plan {
  weeklyHours: number;
  projects: Project[];
  flags: string[];
}

/* Labels mirror the server's copy only — the scoring opinion stays in src/triage.ts. */
export const WORDS: Record<"pull" | "upside" | "drag" | "spark", string[]> = {
  pull: ["dead flat", "a trickle", "steady", "growing", "taking off"],
  upside: ["tiny", "small", "decent", "big", "huge"],
  drag: ["none", "light", "weekly", "constant", "relentless"],
  spark: ["dreading it", "meh", "fine", "keen", "can't wait"],
};

export const DIALS = ["pull", "upside", "drag", "spark"] as const;

export const BAYS: Record<Bay, { name: string; why: string; color: string }> = {
  focus: { name: "Focus", why: "Real upside, you still want it. Two, max.", color: "var(--bay-focus)" },
  fix: { name: "Fix or decide", why: "Needs one call, not another quarter of drift.", color: "var(--bay-fix)" },
  autopilot: { name: "Autopilot", why: "Runs without you. Check it monthly.", color: "var(--bay-autopilot)" },
  cut: { name: "Cut", why: "Archive it, sell it, or let it lapse.", color: "var(--bay-cut)" },
};

export const BAY_ORDER: Bay[] = ["focus", "fix", "autopilot", "cut"];

export const SIGNAL_KINDS = ["shipped", "revenue", "traffic", "hours", "incident", "note"] as const;

export function getToken(): string {
  try {
    return localStorage.getItem("pc_token") ?? "";
  } catch {
    return "";
  }
}

export function setToken(t: string) {
  try {
    if (t) localStorage.setItem("pc_token", t);
    else localStorage.removeItem("pc_token");
  } catch {
    /* storage unavailable — session-only auth still works */
  }
}

export class AuthError extends Error {}

async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    headers: {
      authorization: "Bearer " + getToken(),
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) throw new AuthError("Session expired — sign in again.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  }
  return data;
}

export const fetchPlan = (): Promise<Plan> => request("/v1/plan");

export const callTool = async (name: string, args: Record<string, unknown> = {}): Promise<string> => {
  const data = await request(`/v1/tools/${name}`, { method: "POST", body: JSON.stringify(args) });
  return data.result as string;
};

export const patchSettings = (weeklyHours: number) =>
  request("/v1/settings", { method: "PATCH", body: JSON.stringify({ weeklyHours }) });

export async function createAccount(label = "personal"): Promise<string> {
  const res = await fetch("/v1/account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.error || "Could not create a board.");
  return data.token as string;
}
