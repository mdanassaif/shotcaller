import { motion } from "motion/react";
import { BAY_ORDER, BAYS, type Plan } from "@/lib/api";
import heroImg from "@/assets/hero.jpg";

function weekLabel() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/** The board's masthead: the week, summarized over the town. */
export function Hero({ plan }: { plan: Plan }) {
  const perBay = BAY_ORDER.map((bay) => ({
    bay,
    hours: Math.round(plan.projects.filter((p) => p.bay === bay).reduce((a, p) => a + p.hours, 0) * 10) / 10,
  })).filter((b) => b.hours > 0);
  const total = perBay.reduce((a, b) => a + b.hours, 0);
  const focusCount = plan.projects.filter((p) => p.bay === "focus").length;

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="relative overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-18px_rgba(0,0,0,0.18)]"
      >
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 size-full object-cover object-[75%_62%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/15" />
        <div className="relative flex flex-col justify-center gap-2.5 px-6 py-6 sm:px-8">
          <div className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Week of {weekLabel()}
          </div>
          <h1 className="text-[24px] leading-tight font-extrabold tracking-[-0.02em] text-balance sm:text-[27px]">
            {plan.projects.length === 0
              ? "Someone has to call the shots."
              : focusCount > 0
                ? "One thing gets the week. The rest get left alone."
                : "The week will go somewhere — decide where."}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            <b className="font-bold text-foreground">{plan.weeklyHours}h</b> this week
            {plan.projects.length > 0 && (
              <>
                {" "}
                across <b className="font-bold text-foreground">{plan.projects.length}</b>{" "}
                {plan.projects.length === 1 ? "project" : "projects"}
              </>
            )}
          </p>
          {total > 0 && (
            <div className="mt-1 max-w-xl">
              <div className="flex h-2 w-full gap-px overflow-hidden rounded-full ring-1 ring-black/5">
                {perBay.map(({ bay, hours }, i) => (
                  <motion.div
                    key={bay}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ type: "spring", duration: 0.6, bounce: 0, delay: 0.15 + i * 0.08 }}
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
          )}
        </div>
      </motion.div>
    </div>
  );
}
