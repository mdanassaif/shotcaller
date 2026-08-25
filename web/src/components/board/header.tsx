import { useState } from "react";
import { LogOutIcon, PlusIcon, ZapIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { patchSettings, type Plan } from "@/lib/api";
import { Wordmark } from "./wordmark";
import { AddProjectDialog } from "./add-dialog";
import { ConnectDialog } from "./connect-dialog";
import { GithubLink } from "./github-link";

function CapacityControl({ plan, onRefresh }: { plan: Plan | null; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (!plan) return null;

  const commit = async () => {
    setEditing(false);
    const v = Number(value);
    if (!v || v === plan.weeklyHours) return;
    try {
      await patchSettings(v);
      toast.success(`Capacity set to ${Math.min(Math.max(Math.round(v), 1), 120)}h a week.`);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (editing) {
    return (
      <span className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs whitespace-nowrap text-muted-foreground">
        <input
          autoFocus
          type="number"
          min={1}
          max={120}
          defaultValue={plan.weeklyHours}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-10 bg-transparent text-right font-semibold text-foreground tabular-nums outline-none"
        />
        h / week
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Weekly capacity — click to edit"
      className="rounded-md px-2 py-1 font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground"
    >
      <b className="font-semibold text-foreground">{plan.weeklyHours}h</b>
      <span className="hidden sm:inline"> / week</span>
    </button>
  );
}

export function AppHeader({
  plan,
  onRefresh,
  onSignOut,
}: {
  plan: Plan | null;
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center gap-1 px-4 py-3 sm:gap-2 sm:px-6">
        <Wordmark />
        <div className="min-w-2 flex-1" />
        <GithubLink className="hidden sm:inline-flex" />
        <CapacityControl plan={plan} onRefresh={onRefresh} />
        <ConnectDialog>
          <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground" title="Use this board from Claude">
            <ZapIcon data-icon="inline-start" />
            <span className="hidden md:inline">connect claude</span>
          </Button>
        </ConnectDialog>
        <AddProjectDialog onChanged={onRefresh}>
          <Button size="sm" className="rounded-lg">
            <PlusIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Add project</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </AddProjectDialog>
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-lg text-muted-foreground"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOutIcon />
        </Button>
      </div>
    </header>
  );
}
