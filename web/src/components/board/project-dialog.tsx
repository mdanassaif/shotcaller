import { useEffect, useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogSectionLabel, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { BAY_ORDER, BAYS, DIALS, SIGNAL_KINDS, WORDS, callTool, type Project } from "@/lib/api";
import { cn } from "@/lib/utils";

type Scores = Record<(typeof DIALS)[number], number>;

function ScoreRow({
  dial,
  value,
  onChange,
}: {
  dial: (typeof DIALS)[number];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[56px_1fr_92px] items-center gap-3">
      <span className="text-[13px] text-muted-foreground capitalize">{dial}</span>
      <Slider min={1} max={5} step={1} value={value} onValueChange={(v) => onChange(v as number)} />
      <span className="text-right text-xs">{WORDS[dial][value - 1]}</span>
    </div>
  );
}

export function ProjectDialog({
  project,
  onClose,
  onChanged,
}: {
  project: Project | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [scores, setScores] = useState<Scores>({ pull: 3, upside: 3, drag: 3, spark: 3 });
  const [history, setHistory] = useState("Loading…");
  const [sigKind, setSigKind] = useState<string>("shipped");
  const [sigValue, setSigValue] = useState("");
  const [sigNote, setSigNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setUrl(project.url ?? "");
    setNote(project.note ?? "");
    setScores({ pull: project.pull, upside: project.upside, drag: project.drag, spark: project.spark });
    setHistory("Loading…");
    setSigKind("shipped");
    setSigValue("");
    setSigNote("");
    callTool("project_history", { project: project.id, limit: 15 })
      .then(setHistory)
      .catch((e) => setHistory(e instanceof Error ? e.message : String(e)));
  }, [project]);

  if (!project) return <Dialog open={false} onOpenChange={() => {}} />;

  const run = async (fn: () => Promise<void>, close = true) => {
    setBusy(true);
    try {
      await fn();
      if (close) onClose();
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const msgs: string[] = [];
      if (name.trim() !== project.name || url.trim() !== (project.url ?? "") || note.trim() !== (project.note ?? "")) {
        msgs.push(
          await callTool("upsert_project", {
            id: project.id,
            name: name.trim() || project.name,
            url: url.trim() || undefined,
            note: note.trim() || undefined,
          })
        );
      }
      if (DIALS.some((d) => scores[d] !== project[d])) {
        msgs.push(await callTool("score_project", { project: project.id, ...scores }));
      }
      toast(msgs.length ? msgs.join("\n") : "Nothing changed.");
    });

  const pinTo = (bay: string) =>
    run(async () => {
      toast(await callTool("move_project", { project: project.id, bay, pinned: true }));
    });

  const release = () =>
    run(async () => {
      toast(await callTool("move_project", { project: project.id, bay: project.bay, pinned: false }));
    });

  const logSignal = () =>
    run(async () => {
      toast(
        await callTool("log_signal", {
          project: project.id,
          kind: sigKind,
          value: sigValue === "" ? undefined : Number(sigValue),
          note: sigNote || undefined,
        })
      );
      setSigValue("");
      setSigNote("");
      setHistory(await callTool("project_history", { project: project.id, limit: 15 }));
    }, false);

  const bay = BAYS[project.bay];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="flex items-center gap-2.5 pr-8">
          <DialogTitle>{project.name}</DialogTitle>
          <Badge variant="outline" className="font-mono text-[10.5px] tracking-[0.05em] uppercase tabular-nums">
            {bay.name} · {project.hours}h
          </Badge>
        </div>

        <div className="mt-5">
          <DialogSectionLabel>Details</DialogSectionLabel>
          <div className="space-y-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https:// (optional)" />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One line: what it is and where it stands"
            />
          </div>
        </div>

        <div className="mt-5">
          <DialogSectionLabel>Scores — the four questions</DialogSectionLabel>
          <div className="space-y-1.5">
            {DIALS.map((d) => (
              <ScoreRow key={d} dial={d} value={scores[d]} onChange={(v) => setScores((s) => ({ ...s, [d]: v }))} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground/80 text-pretty">
            Save and the board files it. Pinned projects keep their bay; the toast tells you what the scores would say.
          </p>
        </div>

        <div className="mt-5">
          <DialogSectionLabel>Placement</DialogSectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {BAY_ORDER.map((b) => {
              const active = project.bay === b && project.pinned;
              return (
                <button
                  key={b}
                  disabled={busy}
                  onClick={() => pinTo(b)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.96]",
                    active ? "" : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
                  )}
                  style={
                    active
                      ? {
                          color: BAYS[b].color,
                          borderColor: BAYS[b].color,
                          backgroundColor: `color-mix(in oklab, ${BAYS[b].color} 7%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {BAYS[b].name}
                </button>
              );
            })}
            {project.pinned && (
              <button
                disabled={busy}
                onClick={release}
                className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-ring/50 hover:text-foreground active:scale-[0.96]"
              >
                <RotateCcwIcon className="size-3" />
                release to scoring
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground/80 text-pretty">
            {project.pinned
              ? "Pinned by hand — scores won't move it until released."
              : "Placed by its scores. Click a bay to pin it there instead."}
          </p>
        </div>

        <div className="mt-5">
          <DialogSectionLabel>Log a signal</DialogSectionLabel>
          <div className="grid grid-cols-[1.1fr_0.8fr_1.6fr_auto] gap-1.5">
            <select
              value={sigKind}
              onChange={(e) => setSigKind(e.target.value)}
              className="h-9 min-w-0 rounded-md border bg-card px-2.5 text-[13px] outline-none transition-colors focus:border-ring"
            >
              {SIGNAL_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <Input
              type="number"
              value={sigValue}
              onChange={(e) => setSigValue(e.target.value)}
              placeholder="value"
              className="min-w-0"
            />
            <Input
              value={sigNote}
              onChange={(e) => setSigNote(e.target.value)}
              placeholder="note (optional)"
              className="min-w-0"
            />
            <Button variant="outline" className="rounded-md" onClick={logSignal} disabled={busy}>
              Log
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <DialogSectionLabel>History</DialogSectionLabel>
          <pre className="max-h-40 overflow-y-auto rounded-md border bg-muted/60 px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {history}
          </pre>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={onClose}>
            Close
          </Button>
          <Button className="rounded-lg" onClick={save} disabled={busy}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
