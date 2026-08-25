import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 whitespace-nowrap", className)}>
      <Logo className="size-[18px] text-brand" />
      <span className="text-[16px] font-extrabold tracking-[-0.02em]">shotcaller</span>
    </div>
  );
}
