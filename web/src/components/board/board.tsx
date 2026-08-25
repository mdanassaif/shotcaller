import { useState } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BAY_ORDER, BAYS, callTool, type Bay, type Plan, type Project } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";
import { ProjectDialog } from "./project-dialog";

function BayColumn({
  bay,
  projects,
  onChanged,
  onOpen,
}: {
  bay: Bay;
  projects: Project[];
  onChanged: () => Promise<void>;
  onOpen: (p: Project) => void;
}) {
  const [over, setOver] = useState(false);
  const meta = BAYS[bay];
  const hours = Math.round(projects.reduce((a, p) => a + p.hours, 0) * 10) / 10;

  const drop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    try {
      toast(await callTool("move_project", { project: id, bay, pinned: true }));
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="min-w-0">
      <div
        className="mb-3 flex items-center gap-2 border-b pb-2.5"
        style={{ borderBottomColor: `color-mix(in oklab, ${meta.color} 30%, var(--border))` }}
        title={meta.why}
      >
        <span className="size-2 rounded-full" style={{ background: meta.color }} />
        <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{meta.name}</span>
        <Badge variant="secondary" className="h-4.5 px-1.5 font-mono text-[10.5px] text-muted-foreground tabular-nums">
          {projects.length}
        </Badge>
        <span className="ml-auto">
          {hours > 0 ? (
            <span className="text-[15px] leading-none font-extrabold tracking-[-0.02em] tabular-nums" style={{ color: meta.color }}>
              {hours}h
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cn("flex min-h-28 flex-col gap-2 rounded-lg transition-[background-color,box-shadow] duration-150")}
        style={
          over
            ? {
                backgroundColor: `color-mix(in oklab, ${meta.color} 5%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${meta.color} 35%, transparent)`,
              }
            : undefined
        }
      >
        <AnimatePresence initial={false} mode="popLayout">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} onOpen={onOpen} />
          ))}
        </AnimatePresence>
        {projects.length === 0 && (
          <p className="px-1 py-3 text-xs leading-relaxed text-muted-foreground/70 text-pretty">{meta.why}</p>
        )}
      </div>
    </div>
  );
}

export function Board({ plan, onChanged }: { plan: Plan; onChanged: () => Promise<void> }) {
  const [openProject, setOpenProject] = useState<Project | null>(null);

  return (
    <TooltipProvider>
      <LayoutGroup>
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-start gap-7 px-4 pt-6 pb-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {BAY_ORDER.map((bay) => (
            <BayColumn
              key={bay}
              bay={bay}
              projects={plan.projects.filter((p) => p.bay === bay)}
              onChanged={onChanged}
              onOpen={setOpenProject}
            />
          ))}
        </div>
      </LayoutGroup>
      <ProjectDialog
        project={openProject}
        onClose={() => setOpenProject(null)}
        onChanged={onChanged}
      />
    </TooltipProvider>
  );
}
