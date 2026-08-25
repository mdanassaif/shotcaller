import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthError, fetchPlan, getToken, setToken, type Plan } from "@/lib/api";
import { Welcome } from "@/components/board/welcome";
import { AppHeader } from "@/components/board/header";
import { Flags } from "@/components/board/flags";
import { Board } from "@/components/board/board";
import { EmptyState } from "@/components/board/empty-state";
import { BoardSkeleton } from "@/components/board/skeletons";
import { Hero } from "@/components/board/hero";

type Phase = "boot" | "welcome" | "loading" | "board";

export default function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [plan, setPlan] = useState<Plan | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPlan(await fetchPlan());
      setPhase("board");
    } catch (err) {
      if (err instanceof AuthError) {
        setToken("");
        setPhase("welcome");
      } else {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    }
  }, []);

  useEffect(() => {
    // Magic link: /?key=pc_… signs this browser in, then scrubs the token from the URL.
    const key = new URLSearchParams(location.search).get("key");
    if (key) {
      setToken(key);
      history.replaceState(null, "", location.pathname);
    }
    if (!getToken()) {
      setPhase("welcome");
      return;
    }
    setPhase("loading");
    void refresh();
  }, [refresh]);

  const signOut = () => {
    setToken("");
    setPlan(null);
    setPhase("welcome");
  };

  if (phase === "boot") return null;
  if (phase === "welcome") {
    return (
      <Welcome
        onEntered={() => {
          setPhase("loading");
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader plan={plan} onRefresh={refresh} onSignOut={signOut} />
      {phase === "loading" || !plan ? (
        <BoardSkeleton />
      ) : (
        <>
          <Hero plan={plan} />
          {plan.projects.length > 0 ? <Flags flags={plan.flags} /> : <EmptyState onChanged={refresh} />}
          <Board plan={plan} onChanged={refresh} />
        </>
      )}
    </div>
  );
}
