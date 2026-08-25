import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAccount, fetchPlan, setToken } from "@/lib/api";
import { Wordmark } from "./wordmark";
import { GithubLink } from "./github-link";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export function Welcome({ onEntered }: { onEntered: () => void }) {
  const [busy, setBusy] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenValue, setTokenValue] = useState("");
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      setToken(await createAccount());
      toast.success("Board ready. It's yours — this browser holds the key.");
      onEntered();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const openWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = tokenValue.trim();
    if (!t) return;
    setBusy(true);
    setError("");
    setToken(t);
    try {
      await fetchPlan();
      onEntered();
    } catch {
      setToken("");
      setError("That token didn't open anything. Check it and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-sm text-center">
        <motion.div {...fadeUp} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
          <Wordmark className="justify-center" />
        </motion.div>
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.06, ease: [0.2, 0, 0, 1] }}
          className="mt-4 text-[32px] font-extrabold tracking-[-0.03em] text-balance"
        >
          Someone has to call the shots.
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.2, 0, 0, 1] }}
          className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground text-pretty"
        >
          Too many projects, one week. Score them, and the board decides which get the hours and which
          get left alone.
        </motion.p>
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.18, ease: [0.2, 0, 0, 1] }} className="mt-6">
          <Button className="w-full rounded-lg" size="lg" onClick={start} disabled={busy}>
            {busy ? "Setting up…" : "Start my board"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full rounded-lg text-muted-foreground"
            onClick={() => setShowTokenForm((v) => !v)}
          >
            I already have a token
          </Button>
          {showTokenForm && (
            <form onSubmit={openWithToken} className="mt-2 space-y-2 duration-200 animate-in fade-in slide-in-from-top-1">
              <Input
                type="password"
                placeholder="pc_…"
                autoFocus
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                className="rounded-lg font-mono text-xs"
              />
              <Button type="submit" variant="outline" className="w-full rounded-lg" disabled={busy}>
                Open the board
              </Button>
            </form>
          )}
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
          <div className="mt-5 flex justify-center">
            <GithubLink />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
