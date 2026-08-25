import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Flags({ flags }: { flags: string[] }) {
  const clean = flags.length === 1 && flags[0].startsWith("Board is clean");
  return (
    <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 pt-4 sm:px-6">
      {flags.map((f, i) => (
        <motion.div
          key={f}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
          className={cn(
            "flex items-baseline gap-2.5 rounded-lg border bg-card px-3.5 py-2 text-[13px] text-muted-foreground text-pretty",
            "border-l-3",
            clean ? "border-l-brand" : "border-l-warn"
          )}
        >
          {clean ? (
            <CheckIcon className="size-3 shrink-0 translate-y-px text-brand" />
          ) : (
            <TriangleAlertIcon className="size-3 shrink-0 translate-y-px text-warn-ink" />
          )}
          {f}
        </motion.div>
      ))}
    </div>
  );
}
