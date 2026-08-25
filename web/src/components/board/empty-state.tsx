import { PlusIcon } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { AddProjectDialog } from "./add-dialog";
import { ConnectDialog } from "./connect-dialog";
import { TerminalDemo } from "./terminal-demo";

const STEPS = [
  { n: "01", label: "Add a project", body: "Name it, one line of context. Ten seconds." },
  { n: "02", label: "Answer four questions", body: "Pull, upside, drag, spark — honest beats optimistic." },
  { n: "03", label: "Get your week", body: "The board files it into a bay and splits your hours." },
];

export function EmptyState({ onChanged }: { onChanged: () => Promise<void> }) {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-11 pb-1 text-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
        <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-balance">Nothing on the board yet.</h2>
        <p className="mt-2 text-[13.5px] text-muted-foreground text-pretty">
          Every project you're juggling gets a card. The board decides which get the week.
        </p>
      </motion.div>
      <div className="my-6 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 + i * 0.07, ease: [0.2, 0, 0, 1] }}
          >
            <div className="font-mono text-xs font-semibold text-brand">{s.n}</div>
            <div className="mt-1 text-[13.5px] font-semibold tracking-[-0.01em]">{s.label}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">{s.body}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.32, ease: [0.2, 0, 0, 1] }}
        className="flex justify-center gap-2"
      >
        <AddProjectDialog onChanged={onChanged}>
          <Button className="rounded-lg">
            <PlusIcon data-icon="inline-start" />
            Add your first project
          </Button>
        </AddProjectDialog>
        <ConnectDialog>
          <Button variant="ghost" className="rounded-lg text-muted-foreground">
            or connect Claude and just ask
          </Button>
        </ConnectDialog>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45, ease: [0.2, 0, 0, 1] }}
        className="mt-8"
      >
        <TerminalDemo />
      </motion.div>
    </div>
  );
}
