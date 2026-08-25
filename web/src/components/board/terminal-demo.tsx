import { useEffect, useRef, useState } from "react";

type Line = { type: "user" | "tool" | "assistant"; text: string };

const SCRIPT: Line[] = [
  { type: "user", text: "what should I work on this week?" },
  { type: "tool", text: "Called shotcaller · weekly_plan" },
  { type: "assistant", text: "20h this week. agenturscout gets 18h in focus. gpt-website rides autopilot — leave it alone." },
  { type: "user", text: "log that I shipped the pricing page on agenturscout" },
  { type: "tool", text: "Called shotcaller · log_signal" },
  { type: "assistant", text: "Logged. Third ship this month — pull might be higher than \"steady\" now." },
  { type: "user", text: "score bruhgrow with me" },
  { type: "tool", text: "Called shotcaller · score_project" },
  { type: "assistant", text: "Four questions: is it growing? how big could it get? what does it cost you? do you still want it?" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function TerminalDemo() {
  const [lines, setLines] = useState<{ line: Line; text: string }[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;

    const type = async (index: number, full: string, speed: number) => {
      for (let i = 1; i <= full.length && alive; i++) {
        setLines((ls) => ls.map((l, j) => (j === index ? { ...l, text: full.slice(0, i) } : l)));
        await sleep(speed);
      }
    };

    (async () => {
      while (alive) {
        setLines([]);
        await sleep(400);
        for (const line of SCRIPT) {
          if (!alive) return;
          let index = 0;
          setLines((ls) => {
            index = ls.length;
            return [...ls, { line, text: line.type === "tool" ? line.text : "" }];
          });
          await sleep(50);
          if (line.type === "tool") {
            await sleep(750);
          } else {
            await type(index, line.text, line.type === "user" ? 22 : 12);
            await sleep(line.type === "user" ? 450 : 1300);
          }
        }
        await sleep(3200);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-16px_rgba(0,0,0,0.14)]">
      <div className="flex items-center gap-2 border-b bg-muted/60 px-3.5 py-2">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/40" />
          <span className="relative size-2 rounded-full bg-brand" />
        </span>
        <span className="font-mono text-[11.5px] text-muted-foreground">claude · connected to this board</span>
        <span className="ml-auto rounded-full border px-2 py-px font-mono text-[10px] tracking-[0.05em] text-muted-foreground uppercase">
          live demo
        </span>
      </div>
      <div ref={bodyRef} className="h-52 overflow-y-hidden scroll-smooth px-4 py-3.5 font-mono text-xs leading-[1.7]">
        {lines.map(({ line, text }, i) => {
          const last = i === lines.length - 1 && text.length < line.text.length;
          if (line.type === "user") {
            return (
              <div key={i} className="-mx-4 mb-2 bg-muted/60 px-4 py-1">
                <span className="mr-2 text-muted-foreground">❯</span>
                {text}
                {last && <Cursor />}
              </div>
            );
          }
          if (line.type === "tool") {
            return (
              <div key={i} className="mb-2 text-[11.5px] text-muted-foreground italic">
                {text}
              </div>
            );
          }
          return (
            <div key={i} className="mb-2">
              <span className="mr-2 text-brand">●</span>
              {text}
              {last && <Cursor />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cursor() {
  return <span className="ml-px inline-block h-3.5 w-[7px] translate-y-0.5 animate-[term-blink_1s_step-end_infinite] bg-foreground" />;
}
