import { PinIcon } from "lucide-react";
import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BAYS, DIALS, WORDS, type Project } from "@/lib/api";
import { cn } from "@/lib/utils";

function Dial({ dial, value }: { dial: (typeof DIALS)[number]; value: number }) {
  const hot = dial === "drag" && value >= 4;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="flex cursor-default items-center gap-1 font-mono text-[9.5px] text-muted-foreground/70">
            {dial[0].toUpperCase()}
            <span className="flex gap-[2.5px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "size-[4.5px] rounded-full transition-colors",
                    i <= value ? (hot ? "bg-bay-fix" : "bg-foreground/45") : "bg-border"
                  )}
                />
              ))}
            </span>
          </span>
        }
      />
      <TooltipContent>
        {dial}: {WORDS[dial][value - 1]}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProjectCard({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (p: Project) => void;
}) {
  const bay = BAYS[project.bay];
  return (
    <motion.div
      layout
      layoutId={project.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: "spring", duration: 0.35, bounce: 0, delay: index * 0.03 }}
      draggable
      onDragStart={(e) => {
        (e as unknown as DragEvent).dataTransfer?.setData("text/plain", project.id);
      }}
      onClick={() => onOpen(project)}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-3 shadow-xs",
        "transition-[box-shadow,border-color,translate] duration-150",
        "hover:-translate-y-px hover:border-ring/40 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-16px_rgba(0,0,0,0.16)]",
        "active:translate-y-0"
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="flex-1 truncate text-[13.5px] font-semibold tracking-[-0.01em]">{project.name}</span>
        {project.pinned && (
          <PinIcon className="size-3 shrink-0 self-center text-muted-foreground/60" aria-label="Pinned" />
        )}
        <span className="shrink-0 font-mono text-[11.5px] font-medium tabular-nums" style={{ color: bay.color }}>
          {project.hours}h
        </span>
      </div>
      {project.note && <div className="mt-0.5 truncate text-xs text-muted-foreground">{project.note}</div>}
      <div className="mt-2.5 flex flex-wrap gap-3">
        {DIALS.map((d) => (
          <Dial key={d} dial={d} value={project[d]} />
        ))}
      </div>
      {project.pinned && project.scoresSay !== project.bay && (
        <div className="mt-2 text-[11.5px] text-warn-ink">→ scores say {BAYS[project.scoresSay].name.toLowerCase()}</div>
      )}
    </motion.div>
  );
}
