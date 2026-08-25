import { motion } from "motion/react";
import { BAY_ORDER, BAYS, type Plan } from "@/lib/api";

/** The week at a glance: one bar, split by bay, animated to its shares. */
export function WeekBar({ plan }: { plan: Plan }) {
  const perBay = BAY_ORDER.map((bay) => ({
    bay,
    hours: Math.round(plan.projects.filter((p) => p.bay === bay).reduce((a, p) => a + p.hours, 0) * 10) / 10,
  })).filter((b) => b.hours > 0);

  const total = perBay.reduce((a, b) => a + b.hours, 0);
  if (total <= 0) return null;

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-5 sm:px-6">
      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full">
        {perBay.map(({ bay, hours }, i) => (
          <motion.div
            key={bay}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0, delay: 0.1 + i * 0.08 }}
            className="origin-left"
            style={{ width: `${(hours / total) * 100}%`, backgroundColor: BAYS[bay].color }}
            title={`${BAYS[bay].name} — ${hours}h`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {perBay.map(({ bay, hours }) => (
          <span key={bay} className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: BAYS[bay].color }} />
            {BAYS[bay].name.toLowerCase()} <b className="font-semibold text-foreground">{hours}h</b>
          </span>
        ))}
      </div>
    </div>
  );
}
