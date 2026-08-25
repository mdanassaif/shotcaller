import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogSectionLabel, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Fayaz-style copy button: icons cross-fade with scale + blur. */
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Couldn't copy — select it by hand.");
        }
      }}
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
        "transition-[background-color,color,transform] duration-150 hover:bg-border hover:text-foreground active:scale-[0.92]",
        className
      )}
    >
      <CopyIcon
        className={cn(
          "absolute size-[13px] transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-25 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
        )}
      />
      <CheckIcon
        className={cn(
          "absolute size-[13px] text-brand-ink transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          copied ? "scale-100 opacity-100 blur-0" : "scale-25 opacity-0 blur-[4px]"
        )}
      />
    </button>
  );
}

function TerminalBlock({ title, code, copyText }: { title: string; code: string; copyText?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <div className="flex items-center gap-1.5 border-b bg-muted/60 py-1.5 pr-2 pl-3.5">
        <span className="flex gap-[5px]">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </span>
        <span className="ml-1 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">{title}</span>
        <CopyButton text={copyText ?? code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-[1.65] break-all whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

const CLIENTS = ["Claude Code", "Cursor", "Codex"] as const;
type Client = (typeof CLIENTS)[number];

function snippetFor(client: Client, origin: string, token: string): { title: string; code: string; copy?: string } {
  switch (client) {
    case "Claude Code":
      return {
        title: "terminal",
        code: `claude mcp add --transport http shotcaller ${origin}/mcp \\\n  --header "Authorization: Bearer ${token}"`,
        copy: `claude mcp add --transport http shotcaller ${origin}/mcp --header "Authorization: Bearer ${token}"`,
      };
    case "Cursor":
      return {
        title: ".cursor/mcp.json",
        code: `{\n  "mcpServers": {\n    "shotcaller": {\n      "url": "${origin}/mcp",\n      "headers": { "Authorization": "Bearer ${token}" }\n    }\n  }\n}`,
      };
    case "Codex":
      return {
        title: "~/.codex/config.toml",
        code: `[mcp_servers.shotcaller]\nurl = "${origin}/mcp"\nhttp_headers = { "Authorization" = "Bearer ${token}" }`,
      };
  }
}

export function ConnectDialog({ children }: { children: React.ReactElement }) {
  const [showToken, setShowToken] = useState(false);
  const [client, setClient] = useState<Client>("Claude Code");
  const token = getToken();
  const origin = location.origin;
  const snippet = snippetFor(client, origin, token);

  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent>
        <DialogTitle>Use this board from your AI tools</DialogTitle>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground text-pretty">
          This board is also an <b className="font-semibold text-foreground">MCP server</b> — the same seven
          tools, the same data, for any MCP client. Connect it once and your agent can plan your week, score
          projects, and log what shipped, straight onto this board.
        </p>

        <div className="mt-5">
          <DialogSectionLabel>1 · Connect your tool</DialogSectionLabel>
          <div className="mb-2 flex gap-1.5">
            {CLIENTS.map((c) => (
              <button
                key={c}
                onClick={() => setClient(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors active:scale-[0.96]",
                  client === c
                    ? "border-brand bg-brand/8 text-brand-ink"
                    : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <TerminalBlock title={snippet.title} code={snippet.code} copyText={snippet.copy} />
          {client !== "Claude Code" && (
            <p className="mt-1.5 text-xs text-muted-foreground/80">
              {client === "Cursor"
                ? "Create the file in your project (or ~/.cursor/mcp.json for all projects), then restart Cursor."
                : "Add to your Codex config, then restart Codex."}
            </p>
          )}
        </div>

        <div className="mt-5">
          <DialogSectionLabel>2 · Then just ask</DialogSectionLabel>
          <div className="space-y-1 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              "<b className="font-semibold text-foreground">What should I work on this week?</b>" —{" "}
              <code className="font-mono text-[11.5px] text-brand-ink">weekly_plan()</code>
            </p>
            <p>
              "<b className="font-semibold text-foreground">Score my projects with me</b>" —{" "}
              <code className="font-mono text-[11.5px] text-brand-ink">score_project()</code> asks the four questions
            </p>
            <p>
              "<b className="font-semibold text-foreground">Log that I shipped the checkout fix</b>" —{" "}
              <code className="font-mono text-[11.5px] text-brand-ink">log_signal()</code>
            </p>
          </div>
        </div>

        <div className="mt-5">
          <DialogSectionLabel>Your token</DialogSectionLabel>
          <div className="flex items-center gap-2">
            <code className="h-9 flex-1 truncate rounded-md border bg-muted/60 px-3 leading-9 font-mono text-xs text-muted-foreground">
              {showToken ? token : "•".repeat(20)}
            </code>
            <Button variant="outline" className="rounded-md" onClick={() => setShowToken((v) => !v)}>
              {showToken ? "Hide" : "Show"}
            </Button>
            <Button
              variant="outline"
              className="rounded-md"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(token);
                  toast.success("Copied.");
                } catch {
                  toast.error("Couldn't copy — select it by hand.");
                }
              }}
            >
              Copy
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground/80 text-pretty">
            One account, one key. Anything holding this token can read and write this board.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
